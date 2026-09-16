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
  return [start, end].filter(Boolean).join(" – ")
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
    <article className="rounded-2xl border border-border bg-[#171717] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold"
          aria-hidden
        >
          {(experience.organization || experience.title || "?")
            .trim()
            .charAt(0)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-6">
                {experience.title || "Poste"}
              </h3>
              <p className="font-medium leading-6">
                {experience.organization || "Entreprise"}
              </p>
              <p className="text-base leading-6 text-muted-foreground">
                {[
                  formatPeriod(experience),
                  experience.location,
                  experience.employmentType,
                  LOCATION_TYPE_OPTIONS.find(
                    (option) => option.value === experience.locationType
                  )?.label,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Modifier ${experience.title}`}
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Supprimer cette expérience`}
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isConfirmDelete ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">
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
                <div className="mt-3">
                  <p className="whitespace-pre-wrap text-base leading-6 text-muted-foreground">
                    {displayDescription}
                  </p>
                  {shouldTruncate && (
                    <button
                      type="button"
                      className="mt-1 text-sm font-medium text-primary hover:underline"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? "Voir moins" : "Voir plus"}
                    </button>
                  )}
                </div>
              )}

              {experience.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {experience.skills.map((skill) => (
                    <Badge key={skill} variant="tag">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
}
