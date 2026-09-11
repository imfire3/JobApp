import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { hashCvContent } from "@/lib/cv-analysis/hash"
import {
  CV_EXTRACT_CONTENT_HASH_KEY,
  CV_EXTRACT_MAX_CHARS,
  getStoredCvExtractHash,
  isCvExtractCacheHit,
  snapshotHasUsefulExtract,
  truncateCvTextForExtract,
  withCvExtractHash,
} from "@/lib/profile/cv-extract-cache"

describe("cv-extract-cache", () => {
  it("stores and reads content hash on snapshot", () => {
    const text = "Vincent Product Owner\nParis"
    const snap = withCvExtractHash({ first_name: "Vincent" }, text)
    assert.equal(snap[CV_EXTRACT_CONTENT_HASH_KEY], hashCvContent(text))
    assert.equal(getStoredCvExtractHash(snap), hashCvContent(text))
    assert.equal(isCvExtractCacheHit(text, snap), true)
    assert.equal(isCvExtractCacheHit(`${text}\nextra`, snap), false)
  })

  it("truncates long CV text for extract", () => {
    const long = "a".repeat(CV_EXTRACT_MAX_CHARS + 500)
    const { text, truncated } = truncateCvTextForExtract(long)
    assert.equal(truncated, true)
    assert.ok(text.length < long.length)
    assert.ok(text.includes("[…truncated for extract…]"))
  })

  it("detects useful vs empty snapshot", () => {
    assert.equal(snapshotHasUsefulExtract({ first_name: "A" }), true)
    assert.equal(snapshotHasUsefulExtract({ skills: ["SQL"] }), true)
    assert.equal(snapshotHasUsefulExtract({}), false)
    assert.equal(snapshotHasUsefulExtract(null), false)
  })
})
