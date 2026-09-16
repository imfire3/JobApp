import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseCompanySearchIntent } from "@/lib/ai/schemas/company-search-intent"

describe("parseCompanySearchIntent", () => {
  it("parses clean criteria and coerces booleans", () => {
    const criteria = parseCompanySearchIntent({
      roles: ["Product Owner"],
      sectors: ["fintech"],
      locations: ["Lyon", "Marseille"],
      size_min: 20,
      size_max: 500,
      remote: "oui",
    })
    assert.deepEqual(criteria.roles, ["Product Owner"])
    assert.deepEqual(criteria.sectors, ["fintech"])
    assert.deepEqual(criteria.locations, ["Lyon", "Marseille"])
    assert.equal(criteria.size_min, 20)
    assert.equal(criteria.size_max, 500)
    assert.equal(criteria.remote, true)
    assert.ok(criteria.summary_fr.includes("fintech"))
  })

  it("defaults roles and ignores missing size", () => {
    const criteria = parseCompanySearchIntent({})
    assert.deepEqual(criteria.roles, ["Product Owner", "Product Manager"])
    assert.equal(criteria.size_min, null)
    assert.equal(criteria.size_max, null)
    assert.equal(criteria.remote, false)
    assert.ok(criteria.summary_fr.length > 0)
  })

  it("treats non-sensical size as null", () => {
    const criteria = parseCompanySearchIntent({ size_min: -12, size_max: "abc" })
    assert.equal(criteria.size_min, null)
    assert.equal(criteria.size_max, null)
  })
})