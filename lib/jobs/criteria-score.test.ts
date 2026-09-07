import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyConfirmation,
  computeScoreFromCriteria,
  type JobCriterionAssessment,
} from "@/lib/jobs/criteria-score"

function criterion(
  overrides: Partial<JobCriterionAssessment> & Pick<JobCriterionAssessment, "id" | "label">
): JobCriterionAssessment {
  return {
    weight_percent: 25,
    evidence_level: 0,
    cv_status: "not_evidenced",
    evidence_from_job: "Mentionné dans l’offre",
    evidence_from_cv: null,
    question_to_candidate: null,
    confirmation_status: "none",
    recruiter_block_risk: "medium",
    ...overrides,
  }
}

describe("computeScoreFromCriteria", () => {
  it("returns null when criteria list is empty", () => {
    const result = computeScoreFromCriteria([])
    assert.equal(result.match_score, null)
    assert.equal(result.criteria.length, 0)
  })

  it("computes weighted average of evidence_level / 3", () => {
    // Equal weights: levels 3, 3, 0, 0 → (1+1+0+0)/4 * 100 = 50
    const result = computeScoreFromCriteria([
      criterion({ id: "a", label: "A", weight_percent: 25, evidence_level: 3 }),
      criterion({ id: "b", label: "B", weight_percent: 25, evidence_level: 3 }),
      criterion({ id: "c", label: "C", weight_percent: 25, evidence_level: 0 }),
      criterion({ id: "d", label: "D", weight_percent: 25, evidence_level: 0 }),
    ])
    assert.equal(result.match_score, 50)
  })

  it("renormalizes weights that do not sum to 100", () => {
    // weights 20+20 → renormalized 50/50; levels 3 and 0 → 50
    const result = computeScoreFromCriteria([
      criterion({ id: "a", label: "A", weight_percent: 20, evidence_level: 3 }),
      criterion({ id: "b", label: "B", weight_percent: 20, evidence_level: 0 }),
    ])
    assert.equal(result.match_score, 50)
    assert.equal(result.total_weight, 100)
  })
})

describe("applyConfirmation Life Protection", () => {
  const lifeProtection = criterion({
    id: "life-protection",
    label: "Expérience Life Protection / assurance-vie",
    weight_percent: 40,
    evidence_level: 0,
    cv_status: "not_evidenced",
    evidence_from_job: "Expérience Life Protection requise",
    question_to_candidate:
      "As-tu déjà travaillé sur l’Assurance Vie / Life Protection ?",
    confirmation_status: "asked",
    recruiter_block_risk: "high",
  })

  const other = criterion({
    id: "product-ops",
    label: "Product Ownership",
    weight_percent: 60,
    evidence_level: 3,
    cv_status: "demonstrated",
    evidence_from_cv: "PO SaaS 4 ans",
    recruiter_block_risk: "low",
  })

  it("keeps low score when Life Protection is absent from CV", () => {
    const before = computeScoreFromCriteria([lifeProtection, other])
    // 0.4*(0/3) + 0.6*(3/3) = 0.6 → 60
    assert.equal(before.match_score, 60)
    assert.equal(before.criteria.find((c) => c.id === "life-protection")?.evidence_level, 0)
  })

  it("raises score after yes + meaningful detail", () => {
    const updated = applyConfirmation([lifeProtection, other], {
      criterion_id: "life-protection",
      answer: "yes",
      detail: "2 ans en Assurance Vie chez CNP, pilotage portefeuille et +15% conversion.",
      updated_at: new Date().toISOString(),
    })
    const after = computeScoreFromCriteria(updated)
    const life = after.criteria.find((c) => c.id === "life-protection")
    assert.ok(life)
    assert.equal(life.confirmation_status, "confirmed")
    assert.ok(life.evidence_level >= 2)
    // At least level 2: 0.4*(2/3)+0.6 ≈ 86.7 → 87; rich detail → level 3 → 100
    assert.ok((after.match_score ?? 0) >= 87)
    assert.ok((after.match_score ?? 0) > 60)
  })

  it("does not treat vague yes without detail as level 3", () => {
    const updated = applyConfirmation([lifeProtection, other], {
      criterion_id: "life-protection",
      answer: "yes",
      detail: null,
      updated_at: new Date().toISOString(),
    })
    const life = updated.find((c) => c.id === "life-protection")
    assert.equal(life?.evidence_level, 1)
    assert.equal(life?.confirmation_status, "confirmed")
  })

  it("sets level 0 when denied", () => {
    const withSomeEvidence = {
      ...lifeProtection,
      evidence_level: 1 as const,
    }
    const updated = applyConfirmation([withSomeEvidence, other], {
      criterion_id: "life-protection",
      answer: "no",
      updated_at: new Date().toISOString(),
    })
    const life = updated.find((c) => c.id === "life-protection")
    assert.equal(life?.evidence_level, 0)
    assert.equal(life?.confirmation_status, "denied")
  })
})
