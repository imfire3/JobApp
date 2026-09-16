"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Pencil, Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MONTH_OPTIONS } from "@/lib/cv/experiences"
import { emptyEducationEntry } from "@/lib/profile/helpers"
import type { ProfileEducationEntry } from "@/lib/profile/types"
import { cn } from "@/lib/utils"

const yearOptions = (() => {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let year = current + 1; year >= current - 60; year -= 1) {
    years.push(String(year))
  }
  return years
})()

function formatMonthYear(month: string, year: string): string {
  const monthLabel = month
    ? MONTH_OPTIONS.find((m) => m.value === month)?.label
    : null
  return [monthLabel, year].filter(Boolean).join(" ")
}

function formatPeriodDisplay(entry: ProfileEducationEntry): string {
  const start = formatMonthYear(entry.startMonth, entry.startYear)
  const end = entry.isCurrent
    ? "En cours"
    : formatMonthYear(entry.endMonth, entry.endYear)
  return [start, end].filter(Boolean).join(" – ")
}

function isDateValid(startMonth: string, startYear: string, endMonth: string, endYear: string): boolean {
  if (!startYear || !endYear) return true
  const sY = Number(startYear)
  const eY = Number(endYear)
  if (eY < sY) return false
  if (eY > sY) return true
  const sM = Number(startMonth || "01")
  const eM = Number(endMonth || "12")
  return eM >= sM
}

type EducationCardFormProps = {
  initial?: ProfileEducationEntry | null
  onSave: (entry: ProfileEducationEntry) => void
  onCancel: () => void
}

export function EducationCardForm({
  initial,
  onSave,
  onCancel,
}: EducationCardFormProps) {
  const isEdit = Boolean(initial)
  const [draft, setDraft] = useState<ProfileEducationEntry>(() =>
    initial ? { ...initial, skills: [...initial.skills] } : emptyEducationEntry()
  )
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }, [])

  const canSave = useMemo(() => draft.name.trim().length > 0, [draft.name])

  const dateError = useMemo(() => {
    if (draft.isCurrent) return null
    if (!isDateValid(draft.startMonth, draft.startYear, draft.endMonth, draft.endYear)) {
      return "La date de fin doit être postérieure ou égale à la date de début."
    }
    return null
  }, [draft.startMonth, draft.startYear, draft.endMonth, draft.endYear, draft.isCurrent])

  const handleSave = async () => {
    const errors: Record<string, string> = {}
    if (!draft.name.trim()) {
      errors.name = "Le nom du diplôme est requis."
    }
    if (dateError) {
      errors.dates = dateError
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSaving(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      onSave({
        ...draft,
        name: draft.name.trim(),
        school: draft.school.trim(),
        level: draft.level.trim(),
        description: draft.description.trim(),
      })
      toast.success(isEdit ? "Formation mise à jour" : "Formation ajoutée")
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-[#171717] p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">
        {isEdit ? "Modifier la formation" : "Nouvelle formation"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edu-form-name">
            Diplôme / formation <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={nameRef}
            id="edu-form-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Master Product Management"
            aria-invalid={Boolean(fieldErrors.name)}
            className={cn(fieldErrors.name && "border-destructive")}
          />
          {fieldErrors.name ? (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="edu-form-school">École ou organisme</Label>
          <Input
            id="edu-form-school"
            value={draft.school}
            onChange={(e) => setDraft({ ...draft, school: e.target.value })}
            placeholder="HEC Paris"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edu-form-level">Niveau</Label>
          <Input
            id="edu-form-level"
            value={draft.level}
            onChange={(e) => setDraft({ ...draft, level: e.target.value })}
            placeholder="Bac+5"
          />
        </div>

        <div className="space-y-3 sm:col-span-2">
          <Label>Période</Label>
          <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="edu-form-current" className="mb-0 cursor-pointer text-sm">
                Formation en cours
              </Label>
              <Switch
                id="edu-form-current"
                checked={draft.isCurrent}
                onCheckedChange={(checked) => {
                  const isCurrent = checked === true
                  setDraft((prev) => ({
                    ...prev,
                    isCurrent,
                    endMonth: isCurrent ? "" : prev.endMonth,
                    endYear: isCurrent ? "" : prev.endYear,
                  }))
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Début</Label>
                <div className="flex gap-2">
                  <Select
                    value={draft.startMonth || undefined}
                    onValueChange={(value) =>
                      setDraft({ ...draft, startMonth: value || "" })
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Mois de début">
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={draft.startYear || undefined}
                    onValueChange={(value) =>
                      setDraft({ ...draft, startYear: value || "" })
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Année de début">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!draft.isCurrent ? (
                <div className="space-y-2">
                  <Label>Fin</Label>
                  <div className="flex gap-2">
                    <Select
                      value={draft.endMonth || undefined}
                      onValueChange={(value) =>
                        setDraft({ ...draft, endMonth: value || "" })
                      }
                    >
                      <SelectTrigger className="w-full" aria-label="Mois de fin">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={draft.endYear || undefined}
                      onValueChange={(value) =>
                        setDraft({ ...draft, endYear: value || "" })
                      }
                    >
                      <SelectTrigger className="w-full" aria-label="Année de fin">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center rounded-xl border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  En cours
                </div>
              )}
            </div>

            {fieldErrors.dates ? (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {fieldErrors.dates}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edu-form-desc">Description</Label>
          <p className="text-sm text-muted-foreground">
            Précisez votre spécialisation, vos projets marquants ou les distinctions obtenues.
          </p>
          <Textarea
            id="edu-form-desc"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={4}
            placeholder="Spécialisation, projets, mentions…"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer la formation"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

type EducationCardViewProps = {
  entry: ProfileEducationEntry
  onEdit: (entry: ProfileEducationEntry) => void
  onDelete: (id: string) => void
}

export function EducationCardView({
  entry,
  onEdit,
  onDelete,
}: EducationCardViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const description = entry.description.trim()
  const needsClamp = description.length > 200

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))
      onDelete(entry.id)
      toast.success("Formation supprimée")
    } catch {
      toast.error("Impossible de supprimer cette formation. Veuillez réessayer.")
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (confirmDelete) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-[#171717] p-5 shadow-sm">
        <p className="text-base font-medium">Supprimer cette formation ?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {entry.name || "Cette formation"} sera définitivement supprimée.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <article className="rounded-2xl border border-border bg-[#171717] p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold"
          aria-hidden
        >
          {(entry.school || entry.name || "?")
            .trim()
            .charAt(0)
            .toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-lg font-semibold leading-6">
                {entry.name || "Formation"}
              </h3>
              {entry.school ? (
                <p className="font-medium leading-6">{entry.school}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-base leading-6 text-muted-foreground">
                <span>{formatPeriodDisplay(entry)}</span>
                {entry.level ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{entry.level}</span>
                  </>
                ) : null}
                {entry.isCurrent ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    En cours
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Modifier cette formation"
                title="Modifier cette formation"
                onClick={() => onEdit(entry)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Supprimer cette formation"
                title="Supprimer cette formation"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {description ? (
            <div className="mt-3">
              <p
                className={cn(
                  "whitespace-pre-wrap text-base leading-6 text-muted-foreground",
                  !expanded && needsClamp && "line-clamp-3"
                )}
              >
                {description}
              </p>
              {needsClamp ? (
                <button
                  type="button"
                  className="mt-1 text-sm font-medium text-primary hover:underline"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? "Voir moins" : "Voir plus"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
