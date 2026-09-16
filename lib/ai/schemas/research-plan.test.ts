import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseResearchPlan } from "@/lib/ai/schemas/research-plan"
import { hoursToPublieeDepuis } from "@/lib/research/hours-to-publiee-depuis"

describe("research plan schema", () => {
  it("parses a Marseille 48h / score 70 plan", () => {
    const plan = parseResearchPlan({
      roles: ["Product Owner", "Product Manager"],
      keywords: ["PO", "PM"],
      location: "Marseille",
      published_within_hours: 48,
      min_match_score: 70,
      source_slugs: ["france-travail", "welcome-to-the-jungle", "linkedin-jobs"],
      summary_fr: "PO/PM Marseille 48h score ≥ 70.",
    })
    assert.equal(plan.location, "Marseille")
    assert.equal(plan.published_within_hours, 48)
    assert.equal(plan.min_match_score, 70)
    assert.ok(plan.source_slugs.includes("france-travail"))
  })

  it("accepts my-imported as a research source slug", () => {
    const plan = parseResearchPlan({
      roles: ["Product Owner"],
      keywords: [],
      location: "Marseille",
      published_within_hours: 48,
      min_match_score: 70,
      source_slugs: ["my-imported", "france-travail"],
      summary_fr: "PO Marseille bibliothèque + FT.",
    })
    assert.ok(plan.source_slugs.includes("my-imported"))
    assert.ok(plan.source_slugs.includes("france-travail"))
  })

  it("defaults missing roles and coerces unknown sources", () => {
    const plan = parseResearchPlan({
      roles: [],
      keywords: [],
      location: "Paris",
      published_within_hours: "24",
      min_match_score: "65",
      source_slugs: ["france-travail", "not-a-source"],
      summary_fr: "",
    })
    assert.ok(plan.roles.length > 0)
    assert.equal(plan.published_within_hours, 24)
    assert.equal(plan.min_match_score, 65)
    assert.deepEqual(plan.source_slugs, ["france-travail"])
    assert.match(plan.summary_fr, /Paris/)
  })

  it("rejects completely invalid payload via throw only when zod fails hard", () => {
    assert.throws(() => parseResearchPlan(null), /Invalid research plan/)
  })
})

describe("hoursToPublieeDepuis", () => {
  it("maps 48h to 2 days", () => {
    assert.equal(hoursToPublieeDepuis(48), 2)
  })

  it("maps 24h to 1 day and caps at 31", () => {
    assert.equal(hoursToPublieeDepuis(24), 1)
    assert.equal(hoursToPublieeDepuis(12), 1)
    assert.equal(hoursToPublieeDepuis(24 * 40), 31)
  })
})
