"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LOCATION_TYPE_OPTIONS, MONTH_OPTIONS } from "@/lib/cv/experiences"
import type { ProfileExperienceEntry } from "@/lib/profile/types"

type ExperienceCardProps = {
  experience: ProfileExperienceEntry
  isConfirmDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

function formatPeriod(entry: {
  startMonth: string
  startYear: string
  endMonth: string
  endYear: string
  isCurrent: boolean
}) {
  const start = [
    entry.startMonth
      ? MONTH_OPTIONS.find((m) => m.value === entry.startMonth)?.label
      : null,
    entry.startYear,
  ]
    .filter(Boolean)
    .join(" ")
  const end = entry.isCurrent
    ? "présent"
    : [
        entry.endMonth
          ? MONTH_OPTIONS.find((m) => m.value === entry.endMonth)?.label
          : null,
        entry.endYear,
      ]
        .filter(Boolean)
        .join(" ")
  return [start, end].filter(Boolean).join(" → ")
}

function metaLine(entry: ProfileExperienceEntry): string {
  return [
    formatPeriod(entry),
    entry.location,
    entry.locationType
      ? LOCATION_TYPE_OPTIONS.find((o) => o.value === entry.locationType)?.label
      : null,
    entry.employmentType,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function ExperienceCard({
  experience,
  isConfirmDelete,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: ExperienceCardProps) {
  const [expanded, setExpanded] = useState(false)

  const description = experience.highlights.trim()
  const shouldTruncate = description.length > 200
  const displayDescription = shouldTruncate && !expanded
    ? description.slice(0, 200) + "…"
    : description

  return (
    <article className="rounded-[18px] border border-[rgba(255,255,255,0.07)] bg-[#171717] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">
            {experience.title || "Poste"}
          </h3>
          <p className="text-base font-medium text-[#FAFAFA]">
            {experience.organization || "Entreprise"}
          </p>
          <p className="text-base text-[#A1A1A1]">
            {metaLine(experience)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            className="h-12 gap-2 border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] px-4 text-base font-medium text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]"
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Supprimer cette expérience`}
            onClick={onDelete}
            className="h-12 w-12 border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isConfirmDelete ? (
        <div className="mt-4 rounded-[10px] border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-[#FAFAFA]">
            Supprimer cette expérience ?
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onConfirmDelete}
            >
              Supprimer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelDelete}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <>
          {displayDescription && (
            <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[#A1A1A1]">
              {displayDescription}
            </p>
          )}
          {shouldTruncate && (
            <button
              type="button"
              className="mt-1 text-sm font-medium text-[#00D492] hover:underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Voir moins" : "Voir plus"}
            </button>
          )}

          {experience.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {experience.skills.map((skill) => (
                <Badge key={skill} variant="tag">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  )
}
