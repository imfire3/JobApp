import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildContactsForCompany,
  buildProfileWeights,
  scoreContactRelevanceLocal,
} from "@/lib/jobs/company-prospecting"

describe("scoreContactRelevanceLocal", () => {
  it("scores recruiter-like roles highest", () => {
    const recruiter = scoreContactRelevanceLocal(
      "Recruteur / Talent Acquisition",
      "recruiter"
    )
    const other = scoreContactRelevanceLocal("Inconnu", "other")
    assert.ok(recruiter.score > other.score)
    assert.ok(recruiter.score >= 80)
    assert.equal(other.score, 45)
  })

  it("returns reasons mentioning the role", () => {
    const result = scoreContactRelevanceLocal("Head of Product", "head_of_product")
    assert.ok(result.reasons.length > 0)
  })
})

describe("buildContactsForCompany", () => {
  it("builds four mock contacts without inventing names or emails", () => {
    const contacts = buildContactsForCompany()
    assert.equal(contacts.length, 4)
    for (const contact of contacts) {
      assert.equal(contact.name, "")
      assert.equal(contact.email, null)
      assert.equal(contact.linkedin_url, null)
      assert.equal(contact.current_company, true)
      assert.ok(contact.relevance_score != null && contact.relevance_score > 0)
      assert.ok(contact.role_title.length > 0)
    }
  })
})

describe("buildProfileWeights", () => {
  it("detects remote preference and forwards arrays", () => {
    const weights = buildProfileWeights({
      skills: ["SQL"],
      keywords: ["Product"],
      target_roles: ["Product Manager"],
      target_locations: ["Paris"],
      preferred_industries: ["Fintech"],
      remote_preference: "Remote only",
      years_experience: 5,
    })
    assert.ok(weights)
    assert.equal(weights.remote, true)
    assert.deepEqual(weights.skills, ["SQL"])
    assert.equal(weights.yearsExperience, 5)
  })

  it("returns null for a missing profile", () => {
    assert.equal(buildProfileWeights(null), null)
  })
})