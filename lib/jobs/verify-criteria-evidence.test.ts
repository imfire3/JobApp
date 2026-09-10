import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  enforceCriteriaEvidenceAgainstCv,
  isVerifiableCvQuote,
  normalizeEvidenceText,
} from "@/lib/jobs/verify-criteria-evidence"
import type { JobCriterionAssessment } from "@/lib/jobs/criteria-score"

const cvText = `
Vincent Giacalone — Product Owner
PO chez Fortuneo Mobius pendant 4 ans : priorisation backlog, discovery utilisateurs,
roadmap paiement et résultats +18% conversion.
`

function criterion(
  overrides: Partial<JobCriterionAssessment> & Pick<JobCriterionAssessment, "id" | "label">
): JobCriterionAssessment {
  return {
    weight_percent: 25,
    evidence_level: 3,
    cv_status: "demonstrated",
    evidence_from_job: "Requis dans l’offre",
    evidence_from_cv: null,
    question_to_candidate: null,
    confirmation_status: "none",
    recruiter_block_risk: "medium",
    ...overrides,
  }
}

describe("verify-criteria-evidence", () => {
  it("normalizes accents and punctuation", () => {
    assert.equal(
      normalizeEvidenceText("Assurance-Vie / résultats"),
      "assurance vie resultats"
    )
  })

  it("detects verifiable CV quotes", () => {
    assert.equal(
      isVerifiableCvQuote(cvText, "priorisation backlog, discovery utilisateurs"),
      true
    )
    assert.equal(isVerifiableCvQuote(cvText, "assurance vie life protection"), false)
    assert.equal(isVerifiableCvQuote(cvText, "court"), false)
  })

  it("caps levels without CV evidence to 0", () => {
    const [row] = enforceCriteriaEvidenceAgainstCv(
      [
        criterion({
          id: "a",
          label: "Discovery",
          evidence_level: 3,
          evidence_from_cv: null,
        }),
      ],
      cvText
    )
    assert.equal(row.evidence_level, 0)
    assert.equal(row.cv_status, "not_evidenced")
  })

  it("caps unverified invented quotes to level 1", () => {
    const [row] = enforceCriteriaEvidenceAgainstCv(
      [
        criterion({
          id: "a",
          label: "Assurance Vie",
          evidence_level: 3,
          evidence_from_cv: "Expérience Assurance Vie Life Protection chez AXA",
        }),
      ],
      cvText
    )
    assert.equal(row.evidence_level, 1)
  })

  it("keeps strong level when quote is in the CV", () => {
    const [row] = enforceCriteriaEvidenceAgainstCv(
      [
        criterion({
          id: "a",
          label: "Priorisation",
          evidence_level: 3,
          cv_status: "demonstrated",
          evidence_from_cv: "priorisation backlog, discovery utilisateurs",
        }),
      ],
      cvText
    )
    assert.equal(row.evidence_level, 3)
  })

  it("caps transferable status at level 1 even with a quote", () => {
    const [row] = enforceCriteriaEvidenceAgainstCv(
      [
        criterion({
          id: "a",
          label: "Fintech",
          evidence_level: 3,
          cv_status: "transferable",
          evidence_from_cv: "PO chez Fortuneo Mobius pendant 4 ans",
        }),
      ],
      cvText
    )
    assert.equal(row.evidence_level, 1)
  })
})
