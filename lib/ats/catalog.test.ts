import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildAtsCatalog,
  buildAtsLookupIndex,
  countAtsCatalogStats,
  findAtsKeywordMatches,
  normalizeAtsName,
  roleImportanceFor,
} from "@/lib/ats/index"

describe("ats catalog", () => {
  it("normalizes accents and punctuation", () => {
    assert.equal(normalizeAtsName("Priorisation"), "priorisation")
    assert.equal(normalizeAtsName("A/B Testing"), "a b testing")
    assert.equal(normalizeAtsName("Critères d'acceptation"), "criteres d acceptation")
  })

  it("builds a unique catalog by normalized_name", () => {
    const catalog = buildAtsCatalog()
    const names = catalog.map((row) => row.normalized_name)
    assert.equal(names.length, new Set(names).size)
    assert.ok(catalog.length > 200)
  })

  it("matches exact and alias terms in free text", () => {
    const text = `
      Nous recherchons un Product Manager avec Product Strategy,
      animation d'ateliers, critères d'acceptation et expérience de grooming.
    `
    const hits = findAtsKeywordMatches(text)
    const canonicals = new Set(hits.map((h) => h.canonical_name))
    assert.ok(canonicals.has("Product Strategy"))
    assert.ok(canonicals.has("Workshop Facilitation"))
    assert.ok(canonicals.has("Acceptance Criteria"))
    assert.ok(canonicals.has("Backlog Refinement"))

    const workshop = hits.find((h) => h.canonical_name === "Workshop Facilitation")
    assert.equal(workshop?.match_type, "alias")
  })

  it("exposes role importance overrides from the brief", () => {
    assert.equal(roleImportanceFor("Product Owner", "User Stories"), 0.95)
    assert.equal(roleImportanceFor("Product Manager", "Product Strategy"), 0.95)
    assert.equal(roleImportanceFor("Product Strategist", "Product Strategy"), 1)
    assert.equal(roleImportanceFor("Product Owner", "Product Strategy"), 0.55)
  })

  it("builds a lookup index covering aliases", () => {
    const catalog = buildAtsCatalog()
    const index = buildAtsLookupIndex(catalog)
    assert.ok(index.has(normalizeAtsName("DoD")))
    assert.ok(index.has(normalizeAtsName("Critères d'acceptation")))
    const stats = countAtsCatalogStats(catalog)
    assert.ok(stats.keywordCount > 200)
    assert.equal(stats.roleCount, 4)
  })
})
