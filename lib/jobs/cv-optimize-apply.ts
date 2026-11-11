import { cvOptimizeResponseSchema, type CvOptimizeResponse } from "@/lib/ai/schemas/cv-optimize";
import { isVerifiableCvQuote, questionForRequirement } from "@/lib/jobs/verify-criteria-evidence";
import { isFactuallySafeRewrite } from "@/lib/jobs/rewrite-safety";
import {
  findQuoteSpans,
  insertAfterQuoteOnce,
  replaceQuoteOnce,
} from "@/lib/jobs/cv-quote-match";

export type ApplyValidationResult =
  | { ok: true; applicable: string[] }
  | { ok: false; errors: Array<{ proposalId: string; reason: string }> };

function normalizeFactToken(token: string): string {
  return token
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(/,/g, ".")
    .toUpperCase();
}

/**
 * Facts that must survive any reformulation: numbers/percentages and
 * uppercase acronyms such as QA, KYC, GA4, ROI, UX…
 *
 * Dropping one of these silently changes the candidate's history, so the
 * proposal is refused instead of applied.
 */
export function collectProtectedFacts(text: string): Set<string> {
  const facts = new Set<string>();
  const normalized = text.replace(/\r\n/g, "\n");

  for (const match of normalized.matchAll(/\d+(?:[\s\u00A0\u202F.,]\d+)*[\s\u00A0\u202F]*%?/g)) {
    facts.add(normalizeFactToken(match[0]));
  }

  for (const match of normalized.matchAll(/\b[A-Z][A-Z0-9]{1,}\b/g)) {
    facts.add(normalizeFactToken(match[0]));
  }

  return facts;
}

export function findDroppedProtectedFacts(
  originalText: string,
  proposedText: string,
): string[] {
  const originalFacts = collectProtectedFacts(originalText);
  if (originalFacts.size === 0) return [];

  const proposedFacts = collectProtectedFacts(proposedText);
  return Array.from(originalFacts).filter((fact) => !proposedFacts.has(fact));
}

function normalizeForOfferMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\u00A0\u202F]+/g, " ")
    .toLowerCase()
    .trim();
}

function isOfferTerm(term: string, jobPosting: string): boolean {
  const normalizedTerm = normalizeForOfferMatch(term);
  if (!normalizedTerm) return false;
  return normalizeForOfferMatch(jobPosting).includes(normalizedTerm);
}

/**
 * Removes proposals that would lose a documented fact, and strips
 * keywords that are not actually present in the offer.
 *
 * This is a defensive layer: the prompt already forbids those behaviours,
 * but a model must never be able to apply them silently.
 */
export function sanitizeCvOptimizeResponse(
  response: unknown,
  jobPosting: string,
  cvText?: string,
): CvOptimizeResponse | unknown {
  const parsed = cvOptimizeResponseSchema.safeParse(response);
  if (!parsed.success) return response;

  const data = parsed.data as CvOptimizeResponse;

  const modifications = data.modifications
    .map((m) => {
      const original = m.original_text?.trim() ?? "";
      const sources =
        m.sources.length > 0
          ? m.sources
          : original
            ? [{ kind: "cv" as const, quote: original, location: m.section }]
            : [];

      const keywordsAdded = (m.keywords_added ?? []).filter((keyword) => {
        if (!isOfferTerm(keyword, jobPosting)) return false;
        // A term already in the original sentence is not "added".
        if (original && normalizeForOfferMatch(original).includes(normalizeForOfferMatch(keyword))) {
          return false;
        }
        return true;
      });

      return { ...m, sources, keywords_added: keywordsAdded };
    })
    .filter((m) => {
      if (m.sources.length === 0) return false;
      const original = m.original_text?.trim();
      if (!original) return true;
      const proposed = m.proposed_text?.trim();
      if (!proposed) return false;
      return findDroppedProtectedFacts(original, proposed).length === 0;
    });

  const toConfirm = cvText === undefined ? [] : modifications.filter((m) =>
    m.confirmation_required || !isVerifiableCvQuote(cvText, m.original_text) ||
    !isFactuallySafeRewrite({ original: m.original_text ?? "", rewrite: m.proposed_text }));
  const questionIds = new Set(toConfirm.map((m) => m.id));
  const safeModifications = modifications.filter((m) => !questionIds.has(m.id));
  const keptIds = new Set(safeModifications.map((m) => m.id));

  return {
    ...data,
    modifications: safeModifications,
    optimized_sections: toConfirm.length ? [] : data.optimized_sections,
    questions: [...data.questions.filter(
      (q) =>
        q.related_modification_ids.length === 0 ||
        q.related_modification_ids.some((id) => keptIds.has(id)),
    ), ...toConfirm.map((m) => ({ id: m.id, question: m.question || questionForRequirement(m.offer_requirement || m.element_label || m.section),
      reason: m.justification, related_modification_ids: [], answer_type: "short_text" as const }))],
    keywords_report: {
      present: data.keywords_report.present.filter((item) =>
        isOfferTerm(item.term, jobPosting),
      ),
      to_confirm: data.keywords_report.to_confirm.filter((item) =>
        isOfferTerm(item.term, jobPosting),
      ),
    },
  } as CvOptimizeResponse;
}

export function filterDismissedProposals(
  response: unknown,
  dismissed: Array<{ proposal_id: string; cv_hash?: string | null; job_hash?: string | null }> = [],
  cvHash?: string,
  jobHash?: string,
): unknown {
  const parsed = cvOptimizeResponseSchema.safeParse(response);
  if (!parsed.success) return response;
  const data = parsed.data as CvOptimizeResponse;
  const dismissedSet = new Set(
    dismissed
      .filter((d) => {
        if (!d.proposal_id) return false;
        if (cvHash && d.cv_hash && d.cv_hash !== cvHash) return false;
        if (jobHash && d.job_hash && d.job_hash !== jobHash) return false;
        if (!cvHash && !jobHash) return true;
        if (cvHash && d.cv_hash === cvHash && jobHash && d.job_hash === jobHash) return true;
        if (cvHash && d.cv_hash === cvHash && !d.job_hash && !jobHash) return true;
        if (jobHash && d.job_hash === jobHash && !d.cv_hash && !cvHash) return true;
        return false;
      })
      .map((d) => d.proposal_id),
  );
  if (dismissedSet.size === 0) return data;
  const filtered = {
    ...data,
    modifications: data.modifications.filter((m) => !dismissedSet.has(m.id)),
    questions: data.questions.filter((q) => !q.related_modification_ids?.some((id) => dismissedSet.has(id))),
  };
  return filtered;
}

export function validateCvOptimizeProposals(
  response: unknown,
  cvText: string,
  edits?: Record<string, string>,
): ApplyValidationResult {
  const parsed = cvOptimizeResponseSchema.safeParse(response);
  if (!parsed.success) {
    return {
      ok: false,
      errors: [
        {
          proposalId: "*",
          reason: `Réponse modèle invalide: ${parsed.error.issues.slice(0, 2).map((i) => i.message).join("; ")}`,
        },
      ],
    };
  }

  const data = parsed.data as CvOptimizeResponse;
  const errors: Array<{ proposalId: string; reason: string }> = [];
  const applicable: string[] = [];

  for (const m of data.modifications) {
    if (m.confirmation_required) continue; // jamais appliqué avant réponse
    const proposedText = (edits?.[m.id]?.trim() || m.proposed_text)?.trim();
    if (!proposedText) {
      errors.push({ proposalId: m.id, reason: "proposed_text vide" });
      continue;
    }
    const sources =
      m.sources && m.sources.length > 0
        ? m.sources
        : m.original_text?.trim()
          ? [{ kind: "cv" as const, quote: m.original_text.trim(), location: m.section }]
          : [];
    if (sources.length === 0) {
      errors.push({ proposalId: m.id, reason: "aucune source exploitable" });
      continue;
    }

    const droppedFacts = findDroppedProtectedFacts(m.original_text ?? "", proposedText);
    if (droppedFacts.length) {
      errors.push({ proposalId: m.id, reason: `élément factuel supprimé (${droppedFacts.join(", ")})` });
      continue;
    }
    if (!isVerifiableCvQuote(cvText, m.original_text) ||
        !isFactuallySafeRewrite({ original: m.original_text ?? "", rewrite: proposedText })) {
      errors.push({ proposalId: m.id, reason: "Nouvelle affirmation non démontrée : confirmation requise." });
      continue;
    }

    if (m.type === "reformulation" || m.type === "reorganisation" || m.type === "alleger") {
      if (!m.original_text?.trim()) {
        errors.push({ proposalId: m.id, reason: "original_text manquant" });
        continue;
      }
      const occurrences = findQuoteSpans(cvText, m.original_text);
      if (occurrences.length === 0) {
        errors.push({ proposalId: m.id, reason: "original_text introuvable dans le CV" });
        continue;
      }
      if (occurrences.length > 1) {
        errors.push({ proposalId: m.id, reason: "original_text ambigu (plusieurs occurrences)" });
        continue;
      }
      const dropped = findDroppedProtectedFacts(m.original_text, proposedText);
      if (dropped.length > 0) {
        errors.push({
          proposalId: m.id,
          reason: `élément factuel supprimé (${dropped.join(", ")})`,
        });
        continue;
      }
      applicable.push(m.id);
      continue;
    }

    if (m.type === "ajout") {
      const placement = m.placement || { mode: "replace" };
      if (placement.mode === "replace") {
        if (!m.original_text?.trim()) {
          errors.push({ proposalId: m.id, reason: "ajout par remplacement nécessite original_text" });
          continue;
        }
        const occurrences = findQuoteSpans(cvText, m.original_text);
        if (occurrences.length !== 1) {
          errors.push({ proposalId: m.id, reason: "ajout par remplacement impossible (original introuvable ou ambigu)" });
          continue;
        }
        const dropped = findDroppedProtectedFacts(m.original_text, proposedText);
        if (dropped.length > 0) {
          errors.push({
            proposalId: m.id,
            reason: `élément factuel supprimé (${dropped.join(", ")})`,
          });
          continue;
        }
        applicable.push(m.id);
        continue;
      }
      if (placement.mode === "append_section") {
        if (!m.section?.trim()) {
          errors.push({ proposalId: m.id, reason: "placement append_section sans section" });
          continue;
        }
        applicable.push(m.id);
        continue;
      }
      if (placement.mode === "insert_after") {
        if (!placement.anchor_text?.trim()) {
          errors.push({ proposalId: m.id, reason: "insert_after nécessite une ancre unique" });
          continue;
        }
        const occurrences = findQuoteSpans(cvText, placement.anchor_text);
        if (occurrences.length !== 1) {
          errors.push({ proposalId: m.id, reason: "ancre insert_after introuvable ou ambiguë" });
          continue;
        }
        applicable.push(m.id);
        continue;
      }
      errors.push({ proposalId: m.id, reason: "placement d'ajout non déterministe" });
      continue;
    }
  }

  if (errors.length > 0 && applicable.length === 0) {
    return { ok: false, errors };
  }
  return { ok: true, applicable };
}

export function applyCvOptimizeProposals(
  cvText: string,
  response: unknown,
  proposalIds: string[],
  edits?: Record<string, string>,
): string {
  const parsed = cvOptimizeResponseSchema.parse(response);
  const data = parsed as CvOptimizeResponse;
  let result = cvText;

  for (const id of proposalIds) {
    const m = data.modifications.find((x) => x.id === id);
    if (!m) continue;
    if (m.confirmation_required) continue;
    const proposed = (edits?.[id]?.trim() || m.proposed_text)?.trim();
    if (!proposed) continue;

    if (m.type === "reformulation" || m.type === "reorganisation" || m.type === "alleger") {
      if (!m.original_text?.trim()) continue;
      if (findDroppedProtectedFacts(m.original_text, proposed).length > 0) continue;
      const replaced = replaceQuoteOnce(result, m.original_text, proposed);
      if (replaced === null) continue;
      result = replaced;
      continue;
    }

    if (m.type === "ajout") {
      const placement = m.placement || { mode: "replace" };
      if (placement.mode === "replace") {
        if (!m.original_text?.trim()) continue;
        if (findDroppedProtectedFacts(m.original_text, proposed).length > 0) continue;
        const replaced = replaceQuoteOnce(result, m.original_text, proposed);
        if (replaced === null) continue;
        result = replaced;
        continue;
      }
      if (placement.mode === "insert_after") {
        if (!placement.anchor_text?.trim()) continue;
        const inserted = insertAfterQuoteOnce(result, placement.anchor_text, proposed);
        if (inserted === null) continue;
        result = inserted;
        continue;
      }
      if (placement.mode === "append_section") {
        // Stratégie prudente : append en fin de CV si section non localisable précisément
        // On évite d'inventer un point d'insertion ambigu
        if (m.original_text?.trim()) {
          const inserted = insertAfterQuoteOnce(result, m.original_text, proposed);
          if (inserted !== null) {
            result = inserted;
            continue;
          }
        }
        result = `${result.trim()}\n\n${proposed}`;
        continue;
      }
    }
  }

  return result;
}

export function hasRelevantOptimizations(response: unknown): boolean {
  const parsed = cvOptimizeResponseSchema.safeParse(response);
  if (!parsed.success) return false;
  const data = parsed.data;
  const relevant = data.modifications.filter((m) => !m.confirmation_required && m.proposed_text?.trim());
  if (relevant.length === 0 && data.questions.length === 0) return false;
  return relevant.length > 0;
}
