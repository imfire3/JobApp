import type { JobStatus } from "@/types"

/** French UI labels for job pipeline statuses */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  new: "Nouveau",
  selected: "Sauvegardé",
  cover_generated: "Lettre générée",
  applied: "Candidature envoyée",
  interview: "Entretien en cours",
  offer: "Proposition d’embauche",
  rejected: "Refusé",
  archived: "Archivé",
}

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] ?? status.replace(/_/g, " ")
}

/** French UI labels for a job's work arrangement (`job.remote_mode`). */
export const REMOTE_MODE_LABELS: Record<string, string> = {
  onsite: "Sur site",
  hybrid: "Hybride",
  remote: "À distance",
  unknown: "Non renseigné",
}

export function remoteModeLabel(mode: string | null | undefined): string | null {
  if (!mode) return null
  return REMOTE_MODE_LABELS[mode] ?? mode
}

/** Kanban pipeline columns (technical status of the column) */
export const KANBAN_PIPELINE_COLUMNS = [
  "selected",
  "applied",
  "interview",
  "offer",
] as const

export type KanbanPipelineColumn = (typeof KANBAN_PIPELINE_COLUMNS)[number]

export const KANBAN_COLUMN_LABELS: Record<KanbanPipelineColumn, string> = {
  selected: "Sauvegardé",
  applied: "Candidature envoyée",
  interview: "Entretien en cours",
  offer: "Proposition d’embauche",
}

/** Map any job status to a kanban column, or null if outside pipeline */
export function kanbanColumnForStatus(
  status: JobStatus
): KanbanPipelineColumn | null {
  if (status === "new" || status === "cover_generated" || status === "selected") {
    return "selected"
  }
  if (status === "applied" || status === "interview" || status === "offer") {
    return status
  }
  return null
}
