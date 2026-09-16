import type { CompanyPipelineStatus } from "@/types"

export const PIPELINE_STATUS_LABEL: Record<CompanyPipelineStatus, string> = {
  to_contact: "À contacter",
  contact_found: "Contact trouvé",
  message_prepared: "Message prêt",
  application_sent: "Candidature envoyée",
  follow_up_pending: "Relance à faire",
  response_received: "Réponse reçue",
  interview: "Entretien",
  refused: "Refusé",
  opportunity: "Opportunité",
}

export const PIPELINE_STATUS_TONE: Record<
  CompanyPipelineStatus,
  "neutral" | "positive" | "negative"
> = {
  to_contact: "neutral",
  contact_found: "neutral",
  message_prepared: "neutral",
  application_sent: "positive",
  follow_up_pending: "neutral",
  response_received: "positive",
  interview: "positive",
  refused: "negative",
  opportunity: "positive",
}

export function scoreTone(score: number | null): "low" | "medium" | "good" | "pending" {
  if (score == null) return "pending"
  if (score >= 75) return "good"
  if (score >= 45) return "medium"
  return "low"
}

export function companySizeLabel(
  sizeMin: number | null,
  sizeMax: number | null
): string {
  if (sizeMin == null && sizeMax == null) return "Taille inconnue"
  if (sizeMin != null && sizeMax != null) {
    return sizeMin === sizeMax ? `${sizeMin} salariés` : `${sizeMin}–${sizeMax} salariés`
  }
  if (sizeMin != null) return `${sizeMin}+ salariés`
  return `≤ ${sizeMax} salariés`
}