import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  JOB_MATCH_PROMPT_VERSION,
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchUserPrompt,
} from "./job-match";

describe("job match prompt grounding", () => {
  it("bumps prompt version for criteria × evidence scoring", () => {
    assert.equal(JOB_MATCH_PROMPT_VERSION, "v4");
  });

  it("requires weighted criteria and evidence levels 0–3", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /criteria_assessment/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /evidence_level/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /weight_percent/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /0–3|0-3|∈ \{0,1,2,3\}/);
  });

  it("forbids inventing domain experience missing from the CV", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /N’invente aucune/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /question_to_candidate/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /job_posting_summary/);
  });

  it("puts criteria grounding in the user prompt", () => {
    const prompt = buildJobMatchUserPrompt({
      cvText: "PO chez Fortuneo Mobius",
      targetRoles: [],
      targetLocations: [],
      jobTitle: "Product Owner",
      company: "Acme",
      jobDescription: "Roadmap et discovery B2B, expérience Assurance Vie",
    });
    assert.match(prompt, /criteria_assessment/);
    assert.match(prompt, /evidence_level 0–3/);
    assert.match(prompt, /Never invent domain experience/);
    assert.match(prompt, /<job_posting>/);
    assert.match(prompt, /Assurance Vie/);
  });
});
