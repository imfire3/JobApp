import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJobMatchAnalysis } from "./job-match";

describe("parseJobMatchAnalysis", () => {
  it("flattens rich v3 objects for UI storage", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 72,
      score_confidence: "medium",
      score_explanation: "Bon overlap missions",
      limitations: [],
      job_posting_summary: "PO SaaS B2B.",
      score_breakdown: [
        {
          dimension: "missions",
          score: 80,
          effective_weight_percent: 35,
          rationale: "Missions proches",
        },
      ],
      requirements_assessment: [],
      match_reasons: [
        {
          title: "Priorisation",
          evidence_from_cv: "Backlog ownership",
          evidence_from_job: "Prioriser le backlog",
          explanation: "Preuve claire de priorisation",
        },
      ],
      match_gaps: [
        {
          title: "Discovery",
          severity: "medium",
          gap_type: "not_evidenced",
          evidence_from_job: "Recherche utilisateur",
          evidence_from_cv: null,
          explanation: "Peu de preuves discovery",
          question_to_candidate: "As-tu mené des interviews users ?",
        },
      ],
      keywords_from_job: ["roadmap", "A/B testing", "discovery"],
      keywords_matched: [
        {
          job_term: "roadmap",
          cv_term: "roadmap produit",
          match_type: "equivalent",
          evidence_from_job: "roadmap",
          evidence_from_cv: "roadmap produit",
        },
      ],
      keywords_missing: [
        {
          keyword: "A/B testing",
          importance: "preferred",
          evidence_from_job: "expérimentation",
          comment: "Non documenté",
        },
      ],
      cv_improvements: [
        {
          id: "edit-1",
          priority: "high",
          cv_section: "Expériences",
          action: "Détailler la priorisation",
          evidence_from_cv: "Backlog",
          evidence_from_job: "Prioriser",
          suggested_rewrite: null,
          information_to_confirm: null,
        },
      ],
      cover_letter_angle: "Insister sur la priorisation.",
    });

    assert.equal(parsed.match_score, 72);
    assert.equal(parsed.keywords_matched[0], "roadmap");
    assert.equal(parsed.keywords_missing[0], "A/B testing");
    assert.ok(parsed.keywords_from_job.includes("discovery"));
    assert.ok(parsed.keywords_from_job.includes("roadmap"));
    assert.match(parsed.match_gaps[0] ?? "", /Discovery/);
    assert.match(parsed.cv_improvements[0] ?? "", /Détailler/);
  });

  it("allows null match_score", () => {
    const parsed = parseJobMatchAnalysis({
      status: "insufficient_input",
      match_score: null,
      score_confidence: "low",
      score_explanation: "",
      limitations: ["Job posting empty"],
      job_posting_summary: "",
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      cv_improvements: [],
      cover_letter_angle: "",
    });
    assert.equal(parsed.match_score, null);
  });

  it("derives match_score from score_breakdown when AI leaves it null", () => {
    const parsed = parseJobMatchAnalysis({
      status: "partial",
      match_score: null,
      score_confidence: "medium",
      score_explanation: "Partial",
      limitations: ["Noisy paste"],
      job_posting_summary: "Senior PM.",
      score_breakdown: [
        {
          dimension: "missions",
          score: 80,
          effective_weight_percent: 50,
          rationale: "ok",
        },
        {
          dimension: "product_skills",
          score: 60,
          effective_weight_percent: 50,
          rationale: "ok",
        },
      ],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      keywords_from_job: ["Product Management"],
      cv_improvements: [],
      cover_letter_angle: "",
    });
    assert.equal(parsed.match_score, 70);
  });

  it("coerces null evidence_from_cv in cv_improvements", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 60,
      score_confidence: "medium",
      score_explanation: "Overlap partiel",
      limitations: [],
      job_posting_summary: "PO.",
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [
        {
          title: "Priorisation",
          evidence_from_cv: null,
          evidence_from_job: "Backlog",
          explanation: "OK",
        },
      ],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      cv_improvements: [
        {
          id: "edit-1",
          priority: "high",
          cv_section: "Expériences",
          action: "Ajouter discovery",
          evidence_from_cv: null,
          evidence_from_job: "User research",
          suggested_rewrite: null,
          information_to_confirm: null,
        },
      ],
      cover_letter_angle: "Angle.",
    });

    assert.match(parsed.cv_improvements[0] ?? "", /Ajouter discovery/);
    assert.match(parsed.match_reasons[0] ?? "", /Priorisation/);
  });

  it("computes match_score from criteria_assessment (v4) over AI score", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 99,
      score_confidence: "medium",
      score_explanation: "IA score should be ignored when criteria exist",
      limitations: [],
      job_posting_summary: "PO Assurance Vie.",
      criteria_assessment: [
        {
          id: "life-protection",
          label: "Life Protection",
          weight_percent: 50,
          evidence_level: 0,
          cv_status: "not_evidenced",
          evidence_from_job: "Expérience Assurance Vie",
          evidence_from_cv: null,
          question_to_candidate: "As-tu de l’expérience Assurance Vie ?",
          confirmation_status: "asked",
          recruiter_block_risk: "high",
        },
        {
          id: "product",
          label: "Product Ownership",
          weight_percent: 50,
          evidence_level: 3,
          cv_status: "demonstrated",
          evidence_from_job: "PO",
          evidence_from_cv: "PO 4 ans",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
      ],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      keywords_from_job: [],
      cv_improvements: [],
      cover_letter_angle: "",
    });

    // 0.5*(0/3)+0.5*(3/3) = 50
    assert.equal(parsed.match_score, 50);
    assert.equal(parsed.criteria_assessment?.length, 2);
    assert.equal(
      parsed.criteria_assessment?.[0]?.confirmation_status,
      "asked"
    );
  });

  it("marks criterion with question as asked when confirmation_status is none", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: null,
      score_confidence: "low",
      score_explanation: "",
      limitations: [],
      job_posting_summary: "PO.",
      criteria_assessment: [
        {
          id: "domain",
          label: "Assurance Vie",
          weight_percent: 100,
          evidence_level: 0,
          cv_status: "not_evidenced",
          evidence_from_job: "Domaine AV",
          evidence_from_cv: null,
          question_to_candidate: "As-tu travaillé en Assurance Vie ?",
          confirmation_status: "none",
          recruiter_block_risk: "high",
        },
      ],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      keywords_from_job: [],
      cv_improvements: [],
      cover_letter_angle: "",
    });

    assert.equal(parsed.match_score, 0);
    assert.equal(parsed.criteria_assessment?.[0]?.confirmation_status, "asked");
    assert.match(
      parsed.score_explanation ?? "",
      /critères pondérés|niveau de preuve/i
    );
  });
});
