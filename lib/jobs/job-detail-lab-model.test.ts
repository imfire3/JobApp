import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildCriteriaRows,
  buildKeywordRows,
  buildMatchNarrative,
  buildOverviewRewritePairs,
  buildPriorityActionCards,
  buildPriorityActions,
  buildSubScores,
  criteriaDerivedHighlights,
  estimatePotentialScore,
  isSafeSuggestion,
  matchVerdict,
  projectOptimizedScore,
  resolveLabAnalysisState,
  suggestionLinksToCriterion,
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

  it("builds overview rewrite pairs from safe suggestions only", () => {
    const safe: JobCvImprovementItem = {
      id: "safe-1",
      priority: "medium",
      cv_section: "Expérience",
      action: "Reformuler",
      evidence_from_cv: "Atteinte de 90 % de leads qualifiés.",
      evidence_from_job: "Acquisition",
      suggested_rewrite:
        "Structuration du funnel Acquisition → Activation → Conversion.",
      information_to_confirm: null,
    }
    const needsConfirm: JobCvImprovementItem = {
      id: "confirm-1",
      priority: "high",
      cv_section: "Expérience",
      action: "Confirmer",
      evidence_from_cv: "Produit",
      evidence_from_job: "Assurance",
      suggested_rewrite: "Expérience assurance",
      information_to_confirm: "As-tu bossé en assurance ?",
    }
    const incomplete: JobCvImprovementItem = {
      id: "incomplete-1",
      priority: "low",
      cv_section: "Expérience",
      action: "Manque texte",
      evidence_from_cv: "",
      evidence_from_job: "CRM",
      suggested_rewrite: "Optimisation CRM",
      information_to_confirm: null,
    }
    const pairs = buildOverviewRewritePairs(
      baseJob({
        cv_improvement_items: [safe, needsConfirm, incomplete],
      })
    )
    assert.equal(pairs.length, 1)
    assert.equal(pairs[0]?.id, "safe-1")
    assert.equal(pairs[0]?.fromCv, "Atteinte de 90 % de leads qualifiés.")
    assert.match(pairs[0]?.forOffer ?? "", /Acquisition/)
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

  it("projects score by bumping linked safe suggestions only", () => {
    const criteria: JobCriterionAssessment[] = [
      {
        id: "discovery",
        label: "Ateliers de découverte produit",
        weight_percent: 50,
        evidence_level: 1,
        cv_status: "mentioned_only",
        evidence_from_job: "ateliers de découverte",
        evidence_from_cv: "ateliers métiers",
        question_to_candidate: null,
        confirmation_status: "none",
        recruiter_block_risk: "low",
      },
      {
        id: "insurance",
        label: "Expérience en assurance",
        weight_percent: 50,
        evidence_level: 0,
        cv_status: "not_evidenced",
        evidence_from_job: "secteur assurance",
        evidence_from_cv: null,
        question_to_candidate: "As-tu une XP assurance ?",
        confirmation_status: "asked",
        recruiter_block_risk: "high",
      },
    ]
    const safe: JobCvImprovementItem = {
      id: "safe-discovery",
      priority: "high",
      cv_section: "Fortuneo",
      action: "Renforcer les ateliers de découverte",
      evidence_from_cv: "Animation d’ateliers avec les métiers",
      evidence_from_job: "ateliers de découverte produit",
      suggested_rewrite:
        "Animation d’ateliers de découverte produit (user research)",
      information_to_confirm: null,
    }
    const unsafe: JobCvImprovementItem = {
      id: "unsafe-insurance",
      priority: "high",
      cv_section: "Expérience",
      action: "Ajouter assurance",
      evidence_from_cv: "",
      evidence_from_job: "expérience en assurance",
      suggested_rewrite: "Expérience assurance",
      information_to_confirm: "Confirmes-tu une XP assurance ?",
    }

    assert.equal(suggestionLinksToCriterion(safe, criteria[0]!), true)
    assert.equal(suggestionLinksToCriterion(safe, criteria[1]!), false)

    const result = projectOptimizedScore(
      baseJob({
        match_score: 17,
        criteria_assessment: criteria,
        cv_improvement_items: [safe, unsafe],
        keywords_missing: ["user research", "assurance"],
      })
    )

    assert.equal(result.current, 17)
    assert.equal(result.projected, 33)
    assert.deepEqual(result.bumpedCriterionIds, ["discovery"])
    assert.equal(result.safeSuggestionCount, 1)
  })

  it("does not bump the same criterion twice", () => {
    const criteria: JobCriterionAssessment[] = [
      {
        id: "delivery",
        label: "Coordination de la livraison",
        weight_percent: 100,
        evidence_level: 1,
        cv_status: "mentioned_only",
        evidence_from_job: "livraison",
        evidence_from_cv: "livraison features",
        question_to_candidate: null,
        confirmation_status: "none",
        recruiter_block_risk: "low",
      },
    ]
    const a: JobCvImprovementItem = {
      id: "a",
      priority: "medium",
      cv_section: "XP",
      action: "Mots-clés livraison",
      evidence_from_cv: "coordonne la livraison",
      evidence_from_job: "coordination livraison",
      suggested_rewrite: "Coordination de la livraison agile",
      information_to_confirm: null,
    }
    const b: JobCvImprovementItem = {
      id: "b",
      priority: "medium",
      cv_section: "XP",
      action: "Encore livraison",
      evidence_from_cv: "livraison",
      evidence_from_job: "livraison continue",
      suggested_rewrite: "Pilotage de la livraison continue",
      information_to_confirm: null,
    }
    const result = projectOptimizedScore(
      baseJob({
        criteria_assessment: criteria,
        cv_improvement_items: [a, b],
      })
    )
    assert.equal(result.current, 33)
    assert.equal(result.projected, 67)
    assert.deepEqual(result.bumpedCriterionIds, ["delivery"])
  })

  it("builds second-person match narrative from criteria evidence", () => {
    const narrative = buildMatchNarrative(
      baseJob({
        criteria_assessment: [
          {
            id: "backlog",
            label: "Priorisation backlog",
            weight_percent: 50,
            evidence_level: 2,
            cv_status: "demonstrated",
            evidence_from_job: "prioriser le backlog",
            evidence_from_cv: "Gestion et priorisation d’un backlog mixte",
            question_to_candidate: null,
            confirmation_status: "none",
            recruiter_block_risk: "low",
          },
          {
            id: "insurance",
            label: "Assurance",
            weight_percent: 50,
            evidence_level: 0,
            cv_status: "not_evidenced",
            evidence_from_job: "expérience assurance obligatoire",
            evidence_from_cv: null,
            question_to_candidate: null,
            confirmation_status: "none",
            recruiter_block_risk: "high",
          },
        ],
      })
    )
    assert.match(narrative.fromCv, /backlog/i)
    assert.match(narrative.fromJob, /assurance/i)
  })

  it("builds L/R priority action cards with keywords for safe rewrites", () => {
    const cards = buildPriorityActionCards(
      baseJob({
        keywords_missing: ["user research", "job stories", "assurance"],
        criteria_assessment: [
          {
            id: "discovery",
            label: "Ateliers de découverte",
            weight_percent: 100,
            evidence_level: 1,
            cv_status: "mentioned_only",
            evidence_from_job: "découverte",
            evidence_from_cv: "ateliers",
            question_to_candidate: null,
            confirmation_status: "none",
            recruiter_block_risk: "low",
          },
        ],
        cv_improvement_items: [
          {
            id: "safe-1",
            priority: "high",
            cv_section: "Fortuneo",
            action: "Renforcer discovery",
            evidence_from_cv: "Animation d’ateliers métiers",
            evidence_from_job: "ateliers de découverte",
            suggested_rewrite:
              "Animation d’ateliers de découverte (user research, job stories)",
            information_to_confirm: null,
          },
        ],
      })
    )
    assert.equal(cards.length, 1)
    assert.equal(cards[0]?.kind, "safe_rewrite")
    assert.equal(cards[0]?.fromCv, "Animation d’ateliers métiers")
    assert.match(cards[0]?.rewrite ?? "", /user research/)
    assert.ok(cards[0]?.keywords.includes("user research"))
    assert.ok(cards[0]?.keywords.includes("job stories"))
    assert.equal(cards[0]?.estimatedImpact, 34)
  })
})
