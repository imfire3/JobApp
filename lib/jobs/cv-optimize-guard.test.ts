import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCvOptimizeProposals,
  collectProtectedFacts,
  findDroppedProtectedFacts,
  sanitizeCvOptimizeResponse,
  validateCvOptimizeProposals,
} from "./cv-optimize-apply";

function buildResponse(overrides: {
  original: string;
  proposed: string;
  keywords?: string[];
}) {
  return {
    status: "ok" as const,
    orientation: "Test",
    modifications: [
      {
        id: "m_1",
        type: "reformulation" as const,
        section: "expériences",
        element_id: "exp_1",
        element_label: "Expérience — Product Owner",
        original_text: overrides.original,
        proposed_text: overrides.proposed,
        sources: [{ kind: "cv" as const, quote: overrides.original, location: "expériences" }],
        keywords_added: overrides.keywords ?? [],
        justification: "Test",
        confirmation_required: false,
        question: null,
        offer_requirement: null,
        placement: { mode: "replace" as const, anchor_text: null },
      },
    ],
    optimized_sections: [],
    questions: [],
    keywords_report: { present: [], to_confirm: [] },
  };
}

test("regulatory experience without CV proof becomes a question, not ready-to-apply text", () => {
  const cv = "Gestion du backlog produit"
  const response = buildResponse({original:cv,proposed:`${cv} et conformité réglementaire`,keywords:["conformité réglementaire"]})
  response.modifications[0].element_label = "Conformité réglementaire"
  const safe = sanitizeCvOptimizeResponse(response,"Conformité réglementaire",cv) as import("@/lib/ai/schemas/cv-optimize").CvOptimizeResponse
  assert.deepEqual(safe.modifications,[])
  assert.deepEqual(safe.optimized_sections,[])
  assert.match(safe.questions[0].question,/exigence réglementaire/)
  assert.equal(validateCvOptimizeProposals(response,cv).ok,false)
});

test("collectProtectedFacts keeps numbers, percentages and acronyms", () => {
  const facts = collectProtectedFacts(
    "9 % de conversion, 39 % de drop, 1 500 tickets, QA, KYC, GA4, ROI",
  );

  assert.ok(facts.has("9%"));
  assert.ok(facts.has("39%"));
  assert.ok(facts.has("1500"));
  assert.ok(facts.has("QA"));
  assert.ok(facts.has("KYC"));
  assert.ok(facts.has("GA4"));
  assert.ok(facts.has("ROI"));
});

test("findDroppedProtectedFacts detects a removed acronym and a removed number", () => {
  assert.deepEqual(
    findDroppedProtectedFacts("Pilotage avec QA et 9 % de conversion", "Pilotage avec gestion du backlog"),
    ["9%", "QA"],
  );

  assert.deepEqual(
    findDroppedProtectedFacts("Pilotage avec QA et 9 % de conversion", "Pilotage QA avec 9% de conversion"),
    [],
  );
});

test("sanitize removes a proposal that drops QA", () => {
  const response = buildResponse({
    original: "Pilotage end-to-end : cadrage, delivery, QA et mesure d'impact",
    proposed: "Pilotage end-to-end : cadrage, delivery, gestion du backlog et mesure d'impact",
    keywords: ["gestion du backlog"],
  });

  const sanitized = sanitizeCvOptimizeResponse(response, "gestion du backlog") as {
    modifications: unknown[];
  };

  assert.equal(sanitized.modifications.length, 0);
});

test("sanitize keeps a faithful proposal and preserves the exact offer keyword", () => {
  const response = buildResponse({
    original: "Pilotage de la priorisation produit",
    proposed: "Pilotage de la priorisation produit et arbitrage des sujets",
    keywords: ["arbitrage", "terme absent de l'offre"],
  });

  const sanitized = sanitizeCvOptimizeResponse(
    response,
    "Nous cherchons une personne capable de priorisation produit et d'arbitrage.",
  ) as { modifications: Array<{ keywords_added: string[] }> };

  assert.equal(sanitized.modifications.length, 1);
  assert.deepEqual(sanitized.modifications[0].keywords_added, ["arbitrage"]);
});

test("sanitize does not count a keyword already present in the original sentence", () => {
  const response = buildResponse({
    original: "Pilotage de la priorisation produit",
    proposed: "Pilotage de la priorisation produit",
    keywords: ["priorisation"],
  });

  const sanitized = sanitizeCvOptimizeResponse(
    response,
    "Nous cherchons une personne capable de priorisation produit.",
  ) as { modifications: Array<{ keywords_added: string[] }> };

  assert.deepEqual(sanitized.modifications[0].keywords_added, []);
});

test("validate blocks a user edit that deletes a documented fact", () => {
  const response = buildResponse({
    original: "Pilotage avec QA et 9 % de conversion",
    proposed: "Pilotage avec QA et 9% de conversion",
  });

  const result = validateCvOptimizeProposals(
    response,
    "Pilotage avec QA et 9 % de conversion",
    { m_1: "Pilotage avec gestion du backlog et 9% de conversion" },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors[0].reason, /QA/);
  }
});

test("apply never applies a proposal that drops a documented fact", () => {
  const response = buildResponse({
    original: "Pilotage avec QA et 9 % de conversion",
    proposed: "Pilotage avec gestion du backlog et 9 % de conversion",
  });

  const result = applyCvOptimizeProposals(
    "Pilotage avec QA et 9 % de conversion",
    response,
    ["m_1"],
  );

  assert.equal(result, "Pilotage avec QA et 9 % de conversion");
});

test("apply matches a quote even when line breaks were normalized by the model", () => {
  const cv = "Profil\nJ'accompagne des produits : Product\nDiscovery, priorisation.";
  const response = buildResponse({
    original: "J'accompagne des produits : Product Discovery, priorisation.",
    proposed: "Product Discovery et priorisation : j'accompagne des produits.",
  });

  const validation = validateCvOptimizeProposals(response, cv);
  assert.equal(validation.ok, true);

  const result = applyCvOptimizeProposals(cv, response, ["m_1"]);
  assert.equal(
    result,
    "Profil\nProduct Discovery et priorisation : j'accompagne des produits.",
  );
});

test("apply tolerates typographic apostrophes between CV and model quote", () => {
  const cv = "Profil\nJ’accompagne le produit au quotidien.";
  const response = buildResponse({
    original: "J'accompagne le produit au quotidien.",
    proposed: "Au quotidien, j'accompagne le produit.",
  });

  const validation = validateCvOptimizeProposals(response, cv);
  assert.equal(validation.ok, true);

  const result = applyCvOptimizeProposals(cv, response, ["m_1"]);
  assert.equal(
    result,
    "Profil\nAu quotidien, j'accompagne le produit.",
  );
});

test("apply uses a valid user edit", () => {
  const response = buildResponse({
    original: "Pilotage avec QA",
    proposed: "Pilotage avec QA",
    keywords: [],
  });

  const result = applyCvOptimizeProposals(
    "Pilotage avec QA",
    response,
    ["m_1"],
    { m_1: "Pilotage avec QA et recette utilisateur" },
  );

  assert.equal(result, "Pilotage avec QA et recette utilisateur");
});
