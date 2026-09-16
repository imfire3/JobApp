import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  JOB_MATCH_POLICY_PREFIX,
  JOB_MATCH_PROMPT_VERSION,
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchUserPrompt,
} from "./job-match";

describe("job match prompt grounding", () => {
  it("bumps prompt version for criteria × evidence scoring", () => {
    assert.equal(JOB_MATCH_PROMPT_VERSION, "v12");
  });

  it("requires a coach score_explanation that justifies /100", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /score_explanation \(OBLIGATOIRE/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /\/100/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /blocage principal/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /BLOC 1 — CONTEXTE|paragraphe contexte/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /sans pitch oral/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /≤ 3 bullets|≤ 3 lignes/);
  });

  it("requires CV→ATS rewrite pairs in cv_improvements", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /cv_improvements \(OBLIGATOIRE/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /citation \*\*verbatim\*\*/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /reformulation = même fait/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /keywords_added/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /source_offer_requirement/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /5 à 10 recommandations|≤ 10/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /safe = \*\*true/);
  });

  it("asks for confirmation instead of inventing missing experience", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /confirmation_required/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /requirement/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /question.*fermée|question.*oui\/non/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /déjà optimale.*aucune suggestion|aucune suggestion/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /jamais les deux formes dans un même objet/);
  });

  it("requires weighted criteria and evidence levels 0–3", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /criteria_assessment/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /evidence_level/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /weight_percent/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /0–3|0-3|∈ \{0,1,2,3\}/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /5 à 8|5–8/);
  });

  it("keeps requirements_assessment empty for latency", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /requirements_assessment : \*\*toujours \[\]\*\*/);
  });

  it("addresses free-text feedback in second person", () => {
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /adresse le candidat en \*\*tu\*\*/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /N’écris pas « le candidat »/);
    assert.match(JOB_MATCH_SYSTEM_PROMPT, /Sur ton CV/);
  });

  it("forbids inventing domain experience missing from the CV", () => {
    assert.match(JOB_MATCH_POLICY_PREFIX, /N’invente aucune/);
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
    assert.match(prompt, /requirements_assessment : always \[\]/);
    assert.match(prompt, /<job_posting>/);
    assert.match(prompt, /Assurance Vie/);
  });
});
