/**
 * Resolve a 0–100 match score from analysis artifacts.
 * Prefer the AI match_score, then weighted score_breakdown, then keyword coverage.
 * Never invents facts — only aggregates already-extracted analysis fields.
 */
export type MatchScoreArtifacts = {
  match_score?: number | null
  score_breakdown?: Array<{
    score: number | null
    effective_weight_percent: number
  }> | null
  keywords_matched?: string[] | null
  keywords_missing?: string[] | null
  match_reasons?: string[] | null
  match_gaps?: string[] | null
}

export type DerivedMatchScore = {
  score: number | null
  source: "ai" | "breakdown" | "keywords" | "reasons_gaps" | "none"
}

export function deriveMatchScore(input: MatchScoreArtifacts): DerivedMatchScore {
  if (typeof input.match_score === "number") {
    return { score: clampScore(input.match_score), source: "ai" }
  }

  const fromBreakdown = scoreFromBreakdown(input.score_breakdown)
  if (fromBreakdown != null) {
    return { score: fromBreakdown, source: "breakdown" }
  }

  const matched = (input.keywords_matched ?? []).filter(Boolean).length
  const missing = (input.keywords_missing ?? []).filter(Boolean).length
  const total = matched + missing
  if (total > 0) {
    const reasons = (input.match_reasons ?? []).filter(Boolean).length
    const gaps = (input.match_gaps ?? []).filter(Boolean).length
    let coverage = (matched / total) * 100
    coverage += Math.min(10, reasons * 3)
    coverage -= Math.min(15, gaps * 5)
    return { score: clampScore(Math.round(coverage)), source: "keywords" }
  }

  const reasons = (input.match_reasons ?? []).filter(Boolean).length
  const gaps = (input.match_gaps ?? []).filter(Boolean).length
  if (reasons + gaps > 0) {
    return {
      score: clampScore(Math.round(45 + reasons * 12 - gaps * 14)),
      source: "reasons_gaps",
    }
  }

  return { score: null, source: "none" }
}

function scoreFromBreakdown(
  breakdown: MatchScoreArtifacts["score_breakdown"]
): number | null {
  if (!breakdown?.length) return null

  const weighted = breakdown.filter(
    (item) => typeof item.score === "number" && item.effective_weight_percent > 0
  )
  if (weighted.length > 0) {
    const totalWeight = weighted.reduce(
      (sum, item) => sum + item.effective_weight_percent,
      0
    )
    if (totalWeight <= 0) return null
    return clampScore(
      Math.round(
        weighted.reduce(
          (sum, item) => sum + (item.score as number) * item.effective_weight_percent,
          0
        ) / totalWeight
      )
    )
  }

  const plain = breakdown.filter((item) => typeof item.score === "number")
  if (plain.length === 0) return null
  return clampScore(
    Math.round(
      plain.reduce((sum, item) => sum + (item.score as number), 0) / plain.length
    )
  )
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
