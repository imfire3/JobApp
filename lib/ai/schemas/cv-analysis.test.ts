import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CvAnalysisValidationError,
  parseCvAtsAnalysis,
} from "./cv-analysis";

const validV3Analysis = {
  status: "ok",
  assessment_scope: {
    inputs_observed: ["cv_text"],
    limitations: ["Texte extrait uniquement"],
    ats_disclaimer: "Estimation interne, pas une prédiction ATS.",
  },
  target_roles: [
    {
      role: "Product Owner",
      source: "explicit",
      evidence_from_cv: "Titre: Product Owner",
    },
  ],
  scores: {
    overall_score: 78,
    parsing_score: 80,
    structure_score: 75,
    impact_score: 70,
    keyword_score: 82,
  },
  score_explanations: {
    overall_score: { rationale: "Profil solide", confidence: "medium" },
    parsing_score: { rationale: "Texte lisible", confidence: "high" },
    structure_score: { rationale: "Sections claires", confidence: "medium" },
    impact_score: { rationale: "Peu de métriques", confidence: "medium" },
    keyword_score: { rationale: "Lexique produit présent", confidence: "medium" },
  },
  strengths: [
    {
      title: "Ownership produit",
      explanation: "Missions de priorisation visibles",
      evidence_from_cv: "Pilotage du backlog",
    },
  ],
  weaknesses: [
    {
      title: "Impact peu chiffré",
      explanation: "Peu de résultats quantifiés",
      evidence_from_cv: "Led product delivery for B2B platform",
    },
  ],
  recommendations: [
    {
      id: "rec-1",
      category: "impact",
      severity: "high",
      title: "Ajouter des résultats mesurables",
      explanation: "Les réalisations manquent de KPIs.",
      evidence_from_cv: "Led product delivery for B2B platform",
      suggested_improvement: "Ajouter conversion ou rétention si disponible.",
      suggested_rewrite: null,
      information_to_confirm: "Quels KPIs étaient suivis ?",
    },
  ],
  detected_languages: [
    { language: "French", level: "Native", evidence_from_cv: "Langues: Français" },
  ],
  recruiter_summary: "Profil PO solide, à renforcer sur l’impact chiffré.",
};

describe("parseCvAtsAnalysis", () => {
  it("accepts a valid v3 structured response", () => {
    const parsed = parseCvAtsAnalysis(validV3Analysis);
    assert.equal(parsed.overall_score, 78);
    assert.equal(parsed.recommendations.length, 1);
    assert.equal(parsed.detected_roles[0], "Product Owner");
    assert.match(parsed.strengths[0] ?? "", /Ownership/);
    assert.equal(parsed.strengths_detailed.length, 1);
  });

  it("accepts null scores when a dimension is not evaluable", () => {
    const parsed = parseCvAtsAnalysis({
      ...validV3Analysis,
      scores: {
        overall_score: 60,
        parsing_score: null,
        structure_score: 55,
        impact_score: 50,
        keyword_score: null,
      },
    });
    assert.equal(parsed.parsing_score, null);
    assert.equal(parsed.keyword_score, null);
    assert.equal(parsed.overall_score, 60);
  });

  it("rejects malformed responses", () => {
    assert.throws(
      () => parseCvAtsAnalysis({ scores: { overall_score: "high" } }),
      CvAnalysisValidationError
    );
  });

  it("still accepts legacy flat payloads", () => {
    const parsed = parseCvAtsAnalysis({
      overall_score: 70,
      parsing_score: 70,
      structure_score: 70,
      impact_score: 70,
      keyword_score: 70,
      detected_roles: ["PM"],
      detected_skills: ["Roadmap"],
      detected_tools: ["Jira"],
      detected_languages: [{ language: "French" }],
      detected_industries: ["SaaS"],
      estimated_experience_years: 4,
      strengths: ["Clear ownership"],
      weaknesses: ["Few metrics"],
      missing_product_keywords: ["discovery"],
      recommendations: [
        {
          id: "rec-1",
          category: "impact",
          severity: "medium",
          title: "Add metrics",
          explanation: "Missing KPIs",
          evidence_from_cv: "Led delivery",
          suggested_improvement: "Add retention impact",
        },
      ],
      recruiter_summary: "Solid profile.",
    });
    assert.equal(parsed.overall_score, 70);
    assert.equal(parsed.detected_skills[0], "Roadmap");
  });
});
