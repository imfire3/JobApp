import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CvAnalysisValidationError,
  parseCvAtsAnalysis,
} from "./cv-analysis";

const validAnalysis = {
  overall_score: 78,
  parsing_score: 80,
  structure_score: 75,
  impact_score: 70,
  keyword_score: 82,
  detected_roles: ["Product Owner"],
  detected_skills: ["Agile", "Roadmapping"],
  detected_tools: ["Jira", "Notion"],
  detected_languages: [{ language: "French", level: "Native" }],
  detected_industries: ["SaaS"],
  estimated_experience_years: 5,
  strengths: ["Clear product ownership examples"],
  weaknesses: ["Limited metrics in achievements"],
  missing_product_keywords: ["discovery"],
  recommendations: [
    {
      id: "rec-1",
      category: "impact",
      severity: "high",
      title: "Add measurable outcomes",
      explanation: "Achievements lack quantified results.",
      evidence_from_cv: "Led product delivery for B2B platform",
      suggested_improvement: "Add KPIs such as conversion or retention impact.",
    },
  ],
  recruiter_summary: "Solid PO profile with room to strengthen impact metrics.",
};

describe("parseCvAtsAnalysis", () => {
  it("accepts a valid structured response", () => {
    const parsed = parseCvAtsAnalysis(validAnalysis);
    assert.equal(parsed.overall_score, 78);
    assert.equal(parsed.recommendations.length, 1);
  });

  it("rejects malformed responses", () => {
    assert.throws(
      () => parseCvAtsAnalysis({ overall_score: "high" }),
      CvAnalysisValidationError
    );
  });

  it("enforces score bounds", () => {
    assert.throws(
      () => parseCvAtsAnalysis({ ...validAnalysis, overall_score: 120 }),
      CvAnalysisValidationError
    );
    assert.throws(
      () => parseCvAtsAnalysis({ ...validAnalysis, keyword_score: -1 }),
      CvAnalysisValidationError
    );
  });

  it("requires evidence on recommendations", () => {
    assert.throws(
      () =>
        parseCvAtsAnalysis({
          ...validAnalysis,
          recommendations: [
            {
              ...validAnalysis.recommendations[0],
              evidence_from_cv: "",
            },
          ],
        }),
      CvAnalysisValidationError
    );
  });
});
