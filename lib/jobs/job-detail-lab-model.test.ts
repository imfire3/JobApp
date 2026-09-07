import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildCriteriaRows,
  buildKeywordRows,
  buildPriorityActions,
  buildSubScores,
  criteriaDerivedHighlights,
  estimatePotentialScore,
  isSafeSuggestion,
  matchVerdict,
  resolveLabAnalysisState,
} from "@/lib/jobs/job-detail-lab-model"
import type { Job, JobCvImprovementItem, JobCriterionAssessment } from "@/types"

function baseJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    user_id: "user-1",
    source_key: "paste",
    source_job_id: null,
    source_reference: null,
    company_slug: null,
    company_logo_url: null,
    company_website: null,
    company_industry: null,
    company_size: null,
    city: null,
    district: null,
    country_code: null,
    country: "FR",
    remote_mode: null,
    language: null,
    salary_period: "year",
    experience_level: null,
    experience_min_years: null,
    education_level: null,
    category: null,
    subcategory: null,
    sectors: null,
    summary: null,
    published_at: null,
    scraped_at: new Date().toISOString(),
    profile: null,
    recruitment_process: null,
    benefits: null,
    skills: null,
    tools: null,
    apply_url: null,
    ai_summary: null,
    ai_match_score: null,
    ai_strengths: null,
    ai_gaps: null,
    raw_data: null,
    status: "new",
    match_score: 78,
    match_reasons: ["Product Management"],
    match_gaps: ["Product Strategy"],
    cover_letter_angle: null,
    cover_letter: null,
    selected: false,
    imported_at: new Date().toISOString(),
    keywords_matched: ["Product Management"],
    keywords_missing: ["Product Strategy", "Coaching"],
    keywords_from_job: ["Product Management", "Product Strategy", "Coaching", "Analytics"],
    cv_improvements: null,
    cv_improvement_items: null,
    score_breakdown: null,
    score_explanation: null,
    job_posting_summary: "Poste produit senior.",
    title: "Product Manager",
    company: "Acme",
    location: "Paris",
    remote: false,
    contract_type: "CDI",
    salary: null,
    salary_min: null,
    salary_max: null,
    description: "Desc",
    url: "https://example.com/job",
    source: "paste",
    posted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Job
}

describe("job-detail-lab-model", () => {
  it("resolves analysis states", () => {
    assert.equal(
      resolveLabAnalysisState({ analyzing: true, error: null, job: baseJob() }),
      "analyzing"
    )
    assert.equal(
      resolveLabAnalysisState({
        analyzing: false,
        error: "fail",
        job: baseJob(),
      }),
      "error"
    )
    assert.equal(
      resolveLabAnalysisState({
        analyzing: false,
        error: null,
        job: baseJob({
          match_score: null,
          job_posting_summary: null,
          keywords_from_job: null,
          keywords_matched: null,
          keywords_missing: null,
          match_reasons: null,
          match_gaps: null,
          score_breakdown: null,
          cv_improvement_items: null,
        }),
      }),
      "idle_unanalyzed"
    )
    assert.equal(
      resolveLabAnalysisState({ analyzing: false, error: null, job: baseJob() }),
      "ready"
    )
    assert.equal(
      resolveLabAnalysisState({
        analyzing: false,
        error: null,
        job: baseJob({
          match_score: null,
          job_posting_summary: "Résumé offre partiel",
          keywords_from_job: ["Product Management"],
        }),
      }),
      "ready"
    )
  })

  it("treats null score with fit data as partial verdict, not pending", () => {
    assert.equal(matchVerdict(null).tone, "partial")
    assert.match(matchVerdict(null).label, /Score/)
  })

  it("never invents a potential score without a real match score", () => {
    assert.equal(estimatePotentialScore(null, 3, 2), null)
    assert.equal(estimatePotentialScore(78, 2, 2), 86)
    assert.equal(estimatePotentialScore(95, 5, 10), 100)
  })

  it("uses persisted score_breakdown when available", () => {
    const scores = buildSubScores(
      baseJob({
        score_breakdown: [
          {
            dimension: "missions",
            score: 74,
            effective_weight_percent: 20,
            rationale: "Missions couvertes",
          },
          {
            dimension: "product_skills",
            score: 82,
            effective_weight_percent: 30,
            rationale: "Skills ok",
          },
        ],
      })
    )
    assert.equal(scores[0]?.label, "Compétences")
    assert.equal(scores[0]?.score, 82)
    assert.equal(scores.find((s) => s.id === "missions")?.score, 74)
  })

  it("builds keyword rows with missing first", () => {
    const rows = buildKeywordRows(baseJob())
    assert.equal(rows[0]?.presence, "Absent")
    assert.equal(rows[0]?.importance, "Critique")
    assert.ok(rows.some((r) => r.presence === "Présent"))
  })

  it("builds priority actions from improvement items", () => {
    const item: JobCvImprovementItem = {
      id: "edit-1",
      priority: "high",
      cv_section: "Fortuneo",
      action: 'Ajouter "Product Strategy"',
      evidence_from_cv: "Funnel",
      evidence_from_job: "Strategy cited",
      suggested_rewrite: "Pilotage stratégie funnel",
      information_to_confirm: null,
    }
    const actions = buildPriorityActions(baseJob({ cv_improvement_items: [item] }))
    assert.equal(actions.length, 1)
    assert.equal(actions[0]?.importance, "élevée")
    assert.equal(actions[0]?.estimatedImpact, 5)
    assert.equal(isSafeSuggestion(item), true)
  })

  it("match verdict for scored jobs stays clear", () => {
    assert.equal(matchVerdict(78).label, "Bon match")
    assert.equal(matchVerdict(50).label, "Match partiel")
    assert.equal(matchVerdict(null).tone, "partial")
  })

  it("builds criteria rows and prefers them over legacy sub-scores", () => {
    const criteria: JobCriterionAssessment[] = [
      {
        id: "life-protection",
        label: "Life Protection",
        weight_percent: 40,
        evidence_level: 0,
        cv_status: "not_evidenced",
        evidence_from_job: "AV",
        evidence_from_cv: null,
        question_to_candidate: "As-tu de l’expérience Assurance Vie ?",
        confirmation_status: "asked",
        recruiter_block_risk: "high",
      },
      {
        id: "product",
        label: "Product Ownership",
        weight_percent: 60,
        evidence_level: 3,
        cv_status: "demonstrated",
        evidence_from_job: "PO",
        evidence_from_cv: "4 ans PO",
        question_to_candidate: null,
        confirmation_status: "none",
        recruiter_block_risk: "low",
      },
    ]
    const job = baseJob({
      criteria_assessment: criteria,
      score_breakdown: [
        {
          dimension: "missions",
          score: 74,
          effective_weight_percent: 20,
          rationale: "legacy",
        },
      ],
    })
    assert.equal(buildSubScores(job).length, 0)
    const rows = buildCriteriaRows(job)
    assert.equal(rows.length, 2)
    assert.equal(rows[0]?.id, "product")
    assert.equal(
      rows.find((r) => r.id === "life-protection")?.needsConfirmation,
      true
    )
    const highlights = criteriaDerivedHighlights(job)
    assert.deepEqual(highlights.strengths, ["Product Ownership"])
    assert.ok(highlights.gaps[0]?.includes("Life Protection"))
  })
})
