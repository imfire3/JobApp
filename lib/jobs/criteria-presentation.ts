import type { JobCriterionAssessment } from "@/lib/jobs/criteria-score"
import { isDemonstratedCriterion } from "@/lib/jobs/verify-criteria-evidence"

/** One projection for both new results and historical records. Never trust the
 * independently generated legacy strengths or explanation when criteria exist. */
export function deriveCriteriaPresentation(criteria: JobCriterionAssessment[]) {
  const demonstrated = criteria.filter(isDemonstratedCriterion)
  const toClarify = criteria.filter((item) => !isDemonstratedCriterion(item))
  return {
    strengths: demonstrated.map((item) => `${item.label} — Preuve CV : ${item.evidence_from_cv}`),
    gaps: toClarify.map((item) => `${item.label} — ${item.cv_status === "contradicted"
      ? "Contradiction à vérifier" : item.cv_status === "mentioned_only"
        ? "Compétence mentionnée, pratique à préciser" : "À préciser dans le CV"}`),
    explanation: `${demonstrated.length} attente(s) sur ${criteria.length} démontrée(s) dans ton CV ; ${toClarify.length} à préciser.`,
  }
}
