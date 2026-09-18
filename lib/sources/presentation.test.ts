import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  getSourceCatalogEntry,
  isApiIngestionSource,
  SOURCE_CATALOG,
} from "@/lib/sources/constants"
import { presentSource } from "@/lib/sources/presentation"

describe("source catalog ingestion modes", () => {
  it("marks only france-travail as api", () => {
    assert.equal(isApiIngestionSource("france-travail"), true)
    assert.equal(isApiIngestionSource("linkedin-jobs"), false)
    assert.equal(isApiIngestionSource("welcome-to-the-jungle"), false)
    assert.ok(SOURCE_CATALOG.some((s) => s.slug === "france-travail"))
  })

  it("presents non-live sources as imported libraries without server sync", () => {
    const linkedin = presentSource("linkedin-jobs")
    assert.equal(linkedin.supportsServerSync, false)
    assert.equal(linkedin.displayStatus, "imported_library")
    assert.equal(linkedin.alternateHref, "/imports")

    const wttj = presentSource("welcome-to-the-jungle")
    assert.equal(wttj.supportsServerSync, false)
    assert.equal(wttj.displayStatus, "imported_library")
    assert.equal(wttj.alternateHref, "/imports?paste=1")
    assert.equal(wttj.researchCapability, "imported_only")
  })

  it("exposes catalog metadata for france-travail", () => {
    const entry = getSourceCatalogEntry("france-travail")
    assert.equal(entry?.ingestionMode, "api")
    assert.equal(entry?.name, "France Travail")
  })
})
