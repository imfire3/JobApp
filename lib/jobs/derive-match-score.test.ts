import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { deriveMatchScore } from "@/lib/jobs/derive-match-score"

describe("deriveMatchScore", () => {
  it("prefers explicit AI score", () => {
    assert.deepEqual(
      deriveMatchScore({
        match_score: 78,
        keywords_matched: ["a"],
        keywords_missing: ["b"],
      }),
      { score: 78, source: "ai" }
    )
  })

  it("uses weighted breakdown when AI score is null", () => {
    const result = deriveMatchScore({
      match_score: null,
      score_breakdown: [
        { score: 80, effective_weight_percent: 50 },
        { score: 60, effective_weight_percent: 50 },
      ],
    })
    assert.equal(result.source, "breakdown")
    assert.equal(result.score, 70)
  })

  it("falls back to keyword coverage", () => {
    const result = deriveMatchScore({
      match_score: null,
      score_breakdown: [{ score: null, effective_weight_percent: 0 }],
      keywords_matched: ["a", "b", "c"],
      keywords_missing: ["d"],
      match_reasons: ["force"],
      match_gaps: [],
    })
    assert.equal(result.source, "keywords")
    assert.equal(result.score, 78) // 75 + 3 reason boost
  })

  it("returns null when no artifacts", () => {
    assert.deepEqual(deriveMatchScore({ match_score: null }), {
      score: null,
      source: "none",
    })
  })
})
