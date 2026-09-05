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
});
