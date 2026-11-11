import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildAnalysisCriteria,
  buildAnalysisSummary,
  buildExperienceQuestions,
  buildCvSuggestions,
  countCriteriaByFilter,
  getAnswerFor,
  isQuestionHandled,
  type AnalysisCriterion,
} from "@/lib/jobs/job-analysis-model"
import type { Job } from "@/types"

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    user_id: "user-1",
    title: "Product Manager",
    company: "Example",
    source: "Example source",
    source_key: "example",
    source_job_id: null,
    source_reference: null,
    url: "https://example.test/job",
    location: null,
    contract_type: null,
    description: "Role description",
    summary: null,
    salary: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    experience_min_years: null,
    remote: false,
    remote_mode: null,
    language: null,
    status: "new",
    match_score: null,
    match_reasons: null,
    match_gaps: null,
    cover_letter_angle: null,
    cover_letter: null,
    selected: false,
    imported_at: "2026-01-01T00:00:00.000Z",
    company_slug: null,
    company_logo_url: null,
    company_website: null,
    company_industry: null,
    company_size: null,
    city: null,
    district: null,
    country_code: null,
    country: "FR",
    salary_period: "year",
    experience_level: null,
    education_level: null,
    category: null,
    subcategory: null,
    sectors: null,
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
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Job
}

function criterion(
  overrides: Partial<AnalysisCriterion> & Pick<AnalysisCriterion, "id" | "label">
): AnalysisCriterion {
  return {
    weightPercent: 50,
    status: "not_evidenced",
    evidenceLevel: 0,
    evidenceFromJob: "Requirement excerpt",
    evidenceFromCv: null,
    question: null,
    recruiterBlockRisk: "medium",
    confirmation: null,
    ...overrides,
  }
}

describe("job analysis view model", () => {
  it("keeps candidate declarations separate from CV evidence", () => {
    const job = makeJob({
      criterion_confirmations: [
        {
          criterion_id: "product",
          answer: "yes",
          detail: "I ran a discovery workshop.",
          updated_at: "2026-01-02T00:00:00.000Z",
        },
      ],
      criteria_assessment: [
        {
          id: "product",
          label: "Product discovery",
          weight_percent: 50,
          evidence_level: 0,
          cv_status: "not_evidenced",
          evidence_from_job: "Lead product discovery",
          evidence_from_cv: null,
          question_to_candidate: "As-tu animé un atelier de discovery ?",
          confirmation_status: "asked",
          recruiter_block_risk: "medium",
        },
      ],
    })

    const [mapped] = buildAnalysisCriteria(job)
    assert.equal(mapped.evidenceFromCv, null)
    assert.equal(mapped.status, "not_evidenced")
    assert.equal(mapped.confirmation?.detail, "I ran a discovery workshop.")
    assert.equal(getAnswerFor(job, {
      id: mapped.id,
      criterionId: mapped.id,
      skillKey: "product discovery",
      skillLabel: mapped.label,
      question: mapped.question ?? "",
      origin: "criterion",
    })?.answer, "yes")
  })

  it("does not render a legacy candidate claim as CV evidence and summarizes counts", () => {
    const job = makeJob({
      criterion_confirmations: [{
        criterion_id: "discovery",
        answer: "yes",
        detail: "J’ai animé un atelier de cadrage.",
        updated_at: "2026-01-02T00:00:00.000Z",
      }],
      criteria_assessment: [{
        id: "discovery",
        label: "Discovery produit",
        weight_percent: 100,
        evidence_level: 2,
        cv_status: "transferable",
        evidence_from_job: "Animer des ateliers de discovery",
        evidence_from_cv: "Confirmé par le candidat: J’ai animé un atelier de cadrage.",
        question_to_candidate: null,
        confirmation_status: "confirmed",
        recruiter_block_risk: "medium",
      }],
    })

    const criteria = buildAnalysisCriteria(job)
    assert.equal(criteria[0].evidenceFromCv, null)
    assert.equal(criteria[0].confirmation?.answer, "yes")
    assert.equal(buildAnalysisSummary(job, criteria).headline, "0 critères démontrés · 1 à préciser")
  })

  it("deduplicates experience questions by normalized criterion label", () => {
    const criteria = [
      criterion({ id: "one", label: "Gestion de produit", question: "Question 1 ?" }),
      criterion({ id: "two", label: "Gestion de produit", question: "Question 2 ?" }),
      criterion({ id: "three", label: "Discovery", question: "Question 3 ?" }),
    ]

    const questions = buildExperienceQuestions(makeJob(), criteria)
    assert.deepEqual(questions.map((question) => question.id), ["one", "three"])
  })

  it("keeps an unknown answer unconfirmed rather than treating it as no", () => {
    const job = makeJob({
      criterion_confirmations: [
        {
          criterion_id: "sql",
          answer: "unknown",
          detail: null,
          updated_at: "2026-01-02T00:00:00.000Z",
        },
      ],
    })
    const answer = getAnswerFor(job, {
      id: "sql",
      criterionId: "sql",
      skillKey: "sql",
      skillLabel: "SQL",
      question: "As-tu utilisé SQL ?",
      origin: "criterion",
    })

    assert.equal(answer?.answer, "unknown")
    assert.equal(isQuestionHandled(answer), false)
  })

  it("counts demonstrated and clarification criteria from real statuses", () => {
    const criteria = [
      criterion({ id: "one", label: "Discovery", status: "demonstrated" }),
      criterion({ id: "two", label: "SQL", status: "mentioned_only" }),
      criterion({ id: "three", label: "Leadership", status: "contradicted" }),
    ]

    assert.deepEqual(countCriteriaByFilter(criteria), {
      all: 3,
      demonstrated: 1,
      to_clarify: 2,
    })
  })

  it("does not invent strengths, gaps, or next steps when analysis has no criteria", () => {
    const summary = buildAnalysisSummary(makeJob(), [])

    assert.deepEqual(summary.strengths, [])
    assert.deepEqual(summary.toClarify, [])
    assert.equal(summary.nextStep, null)
    assert.match(summary.headline, /pas produit assez d’éléments/)
  })

  it("ignores a historical free-text summary contradicting the assessed criteria", () => {
    const job = makeJob({score_explanation: "Acquis démontrés : conformité réglementaire et IA."})
    const criteria = [criterion({id: "ai", label: "Cycles de développement IA", status: "mentioned_only"}),
      criterion({id: "reg", label: "Conformité réglementaire", status: "not_evidenced"})]
    const summary = buildAnalysisSummary(job, criteria)
    assert.deepEqual(summary.strengths, [])
    assert.equal(summary.toClarify.length, 2)
    assert.doesNotMatch(summary.headline, /Acquis démontrés/)
    const questions = buildExperienceQuestions(job, criteria)
    assert.match(questions[0].question, /cadrage, au prototypage/)
    assert.match(questions[1].question, /laquelle et qu’as-tu fait concrètement/)
  })

  it("turns an unsupported historical regulatory rewrite into a question", () => {
    const job = makeJob({cv_improvement_items: [{id:"reg",type:"suggestion",priority:"high",cv_section:"Expériences",action:"Conformité réglementaire",evidence_from_cv:"Gestion du backlog produit",evidence_from_job:"Conformité réglementaire",information_to_confirm:null,suggested_rewrite:"Gestion du backlog produit et conformité réglementaire",safe:true}]})
    const [suggestion] = buildCvSuggestions(null, job)
    assert.equal(suggestion.confirmationRequired, true)
    assert.equal(suggestion.proposedText, null)
    assert.match(suggestion.question ?? "", /exigence réglementaire/)
    assert.equal(buildExperienceQuestions(job, [])[0].question, suggestion.question)
  })

  it("keeps question-only confirmation items visible and legacy analyses readable", () => {
    const job = makeJob({score_explanation:"Ancienne analyse à actualiser.",cv_improvement_items:[{id:"ai",type:"confirmation_required",priority:"high",cv_section:"CV",action:"Cycles de développement IA",evidence_from_cv:"",evidence_from_job:"Cycles IA",information_to_confirm:"As-tu participé à un projet IA ?",suggested_rewrite:null,question:"As-tu participé à un projet IA ?"}]})
    assert.equal(buildCvSuggestions(null,job).length,1)
    assert.equal(buildCvSuggestions(null,job)[0].proposedText,null)
    assert.match(buildAnalysisSummary(job,[]).headline,/Ancienne analyse/)
  })
})
