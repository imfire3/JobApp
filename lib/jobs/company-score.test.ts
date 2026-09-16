import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  computeCompanyMatchScore,
  computeOpportunityScore,
} from "@/lib/jobs/company-score"
import type { CompanySearchCriteria } from "@/types"

const fintechCriteria: CompanySearchCriteria = {
  roles: ["Product Owner", "Product Manager"],
  sectors: ["fintech"],
  locations: ["Paris", "Lyon"],
  size_min: 50,
  size_max: 500,
  remote: true,
  summary_fr: "Fintechs françaises 50–500, remote",
}

describe("computeCompanyMatchScore", () => {
  it("gives a good score to an aligned fintech", () => {
    const score = computeCompanyMatchScore(
      fintechCriteria,
      {
        name: "Qonto",
        sector: "Fintech",
        sectors: ["Fintech"],
        keywords: ["Fintech", "Banque", "Scale-up"],
        headquarters: "Paris",
        locations: ["Paris", "Remote France"],
        remote_ok: true,
        size_min: 500,
        size_max: 1000,
      },
      null
    )
    assert.ok(score >= 55, `expected >= 55, got ${score}`)
  })

  it("scores low when sector and location miss", () => {
    const score = computeCompanyMatchScore(
      fintechCriteria,
      {
        name: "Agence web",
        sector: "Creative agency",
        sectors: ["Creative agency"],
        keywords: ["Web", "Design"],
        headquarters: "Bordeaux",
        locations: ["Bordeaux"],
        remote_ok: false,
        size_min: 200,
        size_max: 500,
      },
      null
    )
    assert.ok(score < 45, `expected < 45, got ${score}`)
  })

  it("returns the default baseline when nothing matches", () => {
    const score = computeCompanyMatchScore(
      { ...fintechCriteria, sectors: [], locations: [] },
      {
        name: "X",
        sector: null,
        sectors: [],
        keywords: [],
        headquarters: null,
        locations: [],
        remote_ok: false,
        size_min: null,
        size_max: null,
      },
      null
    )
    assert.equal(score, 50)
  })
})

describe("computeOpportunityScore", () => {
  const baseCompany = {
    name: "PayFit",
    sector: "SaaS",
    sectors: ["SaaS"],
    keywords: ["RH", "Paie"],
    headquarters: "Paris",
    locations: ["Paris", "Remote France"],
    remote_ok: true,
    size_min: 500,
    size_max: 1000,
  }

  it("is higher when a strong contact exists", () => {
    const withoutContact = computeOpportunityScore({
      matchScore: 80,
      criteria: fintechCriteria,
      company: baseCompany,
      contacts: [],
    })
    const withContact = computeOpportunityScore({
      matchScore: 80,
      criteria: fintechCriteria,
      company: baseCompany,
      contacts: [{ relevance_score: 92 }],
    })
    assert.ok(withContact.score > withoutContact.score)
  })

  it("returns scores within [0, 100] and a breakdown", () => {
    const result = computeOpportunityScore({
      matchScore: 70,
      criteria: fintechCriteria,
      company: baseCompany,
      contacts: [{ relevance_score: 80 }],
    })
    assert.ok(result.score >= 0 && result.score <= 100)
    for (const key of [
      "profile_match",
      "sector",
      "location",
      "product_team",
      "growth",
      "contact_available",
    ] as const) {
      assert.equal(typeof result.breakdown[key], "number")
    }
    assert.ok(Array.isArray(result.breakdown.why))
  })

  it("keeps the same components for a given input (deterministic)", () => {
    const a = computeOpportunityScore({
      matchScore: 65,
      criteria: fintechCriteria,
      company: baseCompany,
      contacts: [{ relevance_score: 85 }],
    })
    const b = computeOpportunityScore({
      matchScore: 65,
      criteria: fintechCriteria,
      company: baseCompany,
      contacts: [{ relevance_score: 85 }],
    })
    assert.equal(a.score, b.score)
    assert.equal(a.score, 62)
  })
})