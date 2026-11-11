import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJobMatchAnalysis } from "./job-match";

describe("parseJobMatchAnalysis", () => {
  it("derives strengths and explanation from criteria instead of contradictory generated arrays", () => {
    const parsed = parseJobMatchAnalysis({match_score: 99,
      score_explanation: "Acquis démontrés : IA et conformité réglementaire.",
      criteria_assessment: [
        {id:"ai",label:"Connaissance des cycles de développement IA",weight_percent:50,evidence_level:1,cv_status:"mentioned_only",evidence_from_cv:"Intelligence artificielle",evidence_from_job:"Cycles de développement IA"},
        {id:"reg",label:"Conformité réglementaire",weight_percent:50,evidence_level:0,cv_status:"not_evidenced",evidence_from_cv:null,evidence_from_job:"Conformité réglementaire"},
      ], match_reasons:[{title:"Conformité réglementaire",evidence_from_cv:"",evidence_from_job:"Conformité réglementaire",explanation:"Acquis démontré"}],
      cv_improvements:[{id:"reg",type:"suggestion",action:"Conformité réglementaire",cv_original:"Gestion du backlog produit",reformulation:"Gestion du backlog produit et conformité réglementaire",keywords_added:["conformité réglementaire"],safe:true}],
    }, {cvText:"Gestion du backlog produit. Intelligence artificielle"})
    assert.deepEqual(parsed.match_reasons,[])
    assert.equal(parsed.match_gaps.length,2)
    assert.doesNotMatch(parsed.score_explanation ?? "",/Acquis démontrés/)
    assert.equal(parsed.match_score,17) // existing weighted evidence formula, not a target score
    assert.equal(parsed.cv_improvement_items?.[0].type,"confirmation_required")
    assert.equal(parsed.cv_improvement_items?.[0].suggested_rewrite,null)
    assert.match(parsed.cv_improvement_items?.[0].question ?? "",/exigence réglementaire/)
  });

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

  it("maps v12 suggestions and confirmation_required entries", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 72,
      score_confidence: "medium",
      score_explanation: "OK",
      limitations: [],
      job_posting_summary: "PO Assurance Vie.",
      criteria_assessment: [],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      keywords_from_job: ["Product Owner", "backlog"],
      cv_improvements: [
        {
          id: "rec_1",
          section: "expérience professionnelle",
          cv_original: "J’ai géré des projets et des équipes chez Alinea.",
          reformulation: "J’ai géré des projets et des équipes chez Alinea.",
          reason: "Déjà aligné avec le poste.",
          keywords_added: [],
          source_offer_requirement: "Pilotage d’équipes.",
          confidence: "high",
          safe: true,
        },
        {
          type: "confirmation_required",
          requirement: "Expérience Assurance Vie",
          question: "As-tu déjà travaillé sur un portefeuille Assurance Vie ?",
        },
      ],
      cover_letter_angle: "",
    }, { cvText: "J’ai géré des projets et des équipes chez Alinea." });

    assert.equal(parsed.cv_improvement_items?.length, 2);
    const suggestion = parsed.cv_improvement_items?.[0];
    assert.equal(suggestion?.type, "suggestion");
    assert.equal(suggestion?.safe, true);
    assert.equal(suggestion?.cv_original, "J’ai géré des projets et des équipes chez Alinea.");
    assert.match(suggestion?.reformulation ?? "", /Alinea/);
    assert.deepEqual(suggestion?.keywords_added, []);
    assert.equal(suggestion?.source_offer_requirement, "Pilotage d’équipes.");
    assert.equal(suggestion?.confidence, "high");
    assert.match(parsed.cv_improvements[0] ?? "", /expérience professionnelle/);

    const confirmation = parsed.cv_improvement_items?.[1];
    assert.equal(confirmation?.type, "confirmation_required");
    assert.equal(confirmation?.safe, false);
    assert.equal(confirmation?.action, "Expérience Assurance Vie");
    assert.equal(confirmation?.information_to_confirm, "As-tu déjà travaillé sur un portefeuille Assurance Vie ?");
  });

  it("coerces safe as a boolean-like string and keywords_added from CSV", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 60,
      score_confidence: "medium",
      score_explanation: "OK",
      limitations: [],
      job_posting_summary: "PO.",
      criteria_assessment: [],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_matched: [],
      keywords_missing: [],
      keywords_from_job: [],
      cv_improvements: [
        {
          id: "rec_2",
          section: "compétences",
          cv_original: "Masteurise SQL.",
          reformulation: "Pratique avancée de SQL et gestion de bases de données.",
          reason: "SQL demandé.",
          keywords_added: "SQL, bases de données",
          source_offer_requirement: "SQL",
          confidence: "high",
          safe: "false",
        },
      ],
      cover_letter_angle: "",
    });

    const item = parsed.cv_improvement_items?.[0];
    assert.equal(item?.safe, false);
    assert.equal(item?.type, "confirmation_required");
    assert.equal(item?.suggested_rewrite, null);
    assert.equal(item?.confidence, "low");
    assert.equal(item?.cv_section, "compétences");
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

  it("coerces unknown keywords_matched.match_type instead of failing", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 40,
      score_confidence: "medium",
      score_explanation: "Partial",
      limitations: [],
      job_posting_summary: "PO.",
      criteria_assessment: [],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_from_job: ["roadmap", "agile"],
      keywords_matched: [
        {
          job_term: "roadmap",
          cv_term: "roadmap produit",
          match_type: "partial",
          evidence_from_job: "roadmap",
          evidence_from_cv: "roadmap produit",
        },
        {
          job_term: "agile",
          cv_term: "scrum",
          match_type: "fuzzy",
          evidence_from_job: "agile",
          evidence_from_cv: "scrum",
        },
        {
          job_term: "product",
          cv_term: "produit",
          match_type: "weird_label",
          evidence_from_job: "product",
          evidence_from_cv: "produit",
        },
      ],
      keywords_missing: [],
      cv_improvements: [
        {
          id: "edit-1",
          priority: "high",
          cv_section: "Expériences",
          action: "Reformuler conversion",
          evidence_from_cv: "+9 % conversion ouverture de compte",
          evidence_from_job: "acquisition conversion",
          suggested_rewrite:
            "Optimisation conversion onboarding (+9 %) alignée acquisition",
          information_to_confirm: null,
        },
      ],
      cover_letter_angle: "",
    });

    assert.equal(parsed.match_score, 40);
    assert.ok(parsed.keywords_matched.includes("roadmap"));
    assert.equal(parsed.cv_improvement_items?.length, 1);
    assert.equal(parsed.cv_improvement_items?.[0]?.type, "confirmation_required");
    assert.equal(parsed.cv_improvement_items?.[0]?.suggested_rewrite, null);
  });

  it("coerces invented gap_type, importance, and recruiter_block_risk", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 55,
      score_confidence: "moderate",
      score_explanation: "Partial fit",
      limitations: [],
      job_posting_summary: "PO.",
      criteria_assessment: [
        {
          id: "c1",
          label: "Roadmap",
          weight_percent: 50,
          evidence_level: 2,
          cv_status: "proven",
          evidence_from_job: "roadmap",
          evidence_from_cv: "roadmap produit",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "critique",
        },
      ],
      score_breakdown: [],
      requirements_assessment: [
        {
          requirement: "Agile",
          importance: "must_have",
          evidence_from_job: "agile",
          cv_status: "mentioned",
          evidence_from_cv: "scrum",
          assessment: "ok",
        },
      ],
      match_reasons: [
        {
          title: "Produit",
          evidence_from_cv: "PM",
          evidence_from_job: "PO",
          explanation: "fit",
        },
      ],
      match_gaps: [
        {
          title: "Data",
          severity: "élevé",
          gap_type: "missing",
          evidence_from_job: "SQL",
          evidence_from_cv: null,
          explanation: "absent",
          question_to_candidate: null,
        },
        {
          title: "UX",
          severity: "med",
          gap_type: "incomplete",
          evidence_from_job: "UX research",
          evidence_from_cv: "design light",
          explanation: "partiel",
          question_to_candidate: null,
        },
      ],
      keywords_from_job: ["SQL"],
      keywords_matched: [],
      keywords_missing: [
        {
          keyword: "SQL",
          importance: "nice-to-have",
          evidence_from_job: "SQL",
          comment: "pas dans le CV",
        },
        {
          keyword: "KPI",
          importance: "obligatoire",
          evidence_from_job: "KPI",
          comment: "manquant",
        },
      ],
      cv_improvements: [],
      cover_letter_angle: "",
    });

    assert.ok(typeof parsed.match_score === "number");
    // Legacy gaps are no longer a second competing interpretation of criteria.
    assert.deepEqual(parsed.match_gaps, []);
    assert.match(parsed.match_reasons[0], /Roadmap/);
    assert.ok(Array.isArray(parsed.keywords_missing));
  });

  it("recomputes global score from criteria with normalized weights summing to 100", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 53, // should be overridden by criteria computation
      score_confidence: "medium",
      score_explanation: "test",
      limitations: [],
      job_posting_summary: "PO",
      criteria_assessment: [
        {
          id: "exp-saas",
          label: "Expérience SaaS B2B",
          weight_percent: 20,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "SaaS B2B",
          evidence_from_cv: "Expérience SaaS B2B",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "po",
          label: "Product Ownership / Management",
          weight_percent: 15,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "PO",
          evidence_from_cv: "PO",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "backlog",
          label: "Backlog et Agile",
          weight_percent: 15,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "Backlog",
          evidence_from_cv: "Backlog",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "discovery",
          label: "Product Discovery et UX",
          weight_percent: 15,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "Discovery",
          evidence_from_cv: "Discovery",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "data",
          label: "Data et KPI",
          weight_percent: 15,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "Data",
          evidence_from_cv: "Data",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "ia",
          label: "IA et automatisation",
          weight_percent: 10,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "IA",
          evidence_from_cv: "IA",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "collab",
          label: "Collaboration pluridisciplinaire",
          weight_percent: 10,
          evidence_level: 2,
          cv_status: "demonstrated",
          evidence_from_job: "Collab",
          evidence_from_cv: "Collab",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
      ],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_from_job: [],
      keywords_matched: [],
      keywords_missing: [],
      cv_improvements: [],
      cover_letter_angle: "",
    });
    // All level 2 => (2/3)*100 = ~66.67 -> rounds to 67
    assert.equal(parsed.match_score, 67);
  });

  it("does not turn nice-to-have into must-have and weights normalize to 100", () => {
    const parsed = parseJobMatchAnalysis({
      status: "ok",
      match_score: 10,
      score_confidence: "medium",
      score_explanation: "test",
      limitations: [],
      job_posting_summary: "PO",
      criteria_assessment: [
        {
          id: "main",
          label: "Product Ownership",
          weight_percent: 60,
          evidence_level: 3,
          cv_status: "demonstrated",
          evidence_from_job: "PO",
          evidence_from_cv: "PO",
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
        {
          id: "nice",
          label: "Compétence appréciée",
          weight_percent: 40,
          evidence_level: 0,
          cv_status: "not_evidenced",
          evidence_from_job: "Appréciée",
          evidence_from_cv: null,
          question_to_candidate: null,
          confirmation_status: "none",
          recruiter_block_risk: "low",
        },
      ],
      score_breakdown: [],
      requirements_assessment: [],
      match_reasons: [],
      match_gaps: [],
      keywords_from_job: [],
      keywords_matched: [],
      keywords_missing: [],
      cv_improvements: [],
      cover_letter_angle: "",
    });
    // 0.6*(3/3)+0.4*0 = 60
    assert.equal(parsed.match_score, 60);
    const weights = (parsed.criteria_assessment || []).reduce((s, c) => s + c.weight_percent, 0);
    assert.ok(Math.abs(weights - 100) < 0.01);
  });
});
