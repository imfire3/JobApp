"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Trash2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  MONTH_OPTIONS,
  formatMonthYear,
  isMonthYearValid,
  parseMonthYear,
} from "@/lib/cv/experiences"
import {
  EDUCATION_LEVEL_OPTIONS,
  emptyEducationEntry,
} from "@/lib/profile/helpers"
import type { ProfileEducationEntry } from "@/lib/profile/types"
import { cn } from "@/lib/utils"

function formatPeriodMonthYear(month: string, year: string): string {
  const monthLabel = month
    ? MONTH_OPTIONS.find((m) => m.value === month)?.label
    : null
  return [monthLabel, year].filter(Boolean).join(" ")
}

function formatPeriodDisplay(entry: ProfileEducationEntry): string {
  const start = formatPeriodMonthYear(entry.startMonth, entry.startYear)
  const end = entry.isCurrent
    ? "En cours"
    : formatPeriodMonthYear(entry.endMonth, entry.endYear)
  return [start, end].filter(Boolean).join(" – ")
}

function compareMonthYear(left: string, right: string) {
  const a = parseMonthYear(left)
  const b = parseMonthYear(right)
  if (a.year !== b.year) return a.year < b.year ? -1 : 1
  if (a.month === b.month) return 0
  return a.month < b.month ? -1 : 1
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
  const [startText, setStartText] = useState(() =>
    initial
      ? formatMonthYear(initial.startMonth, initial.startYear)
      : formatMonthYear("", "")
  )
  const [endText, setEndText] = useState(() =>
    initial ? formatMonthYear(initial.endMonth, initial.endYear) : ""
  )
  const nameRef = useRef<HTMLInputElement>(null)

  const levelOptions = useMemo(() => {
    if (draft.level && !EDUCATION_LEVEL_OPTIONS.includes(draft.level)) {
      return [...EDUCATION_LEVEL_OPTIONS, draft.level]
    }
    return EDUCATION_LEVEL_OPTIONS
  }, [draft.level])

  useEffect(() => {
    window.requestAnimationFrame(() => nameRef.current?.focus())
  }, [])

  const canSave = useMemo(() => {
    if (draft.name.trim().length === 0) return false
    if (!isMonthYearValid(startText)) return false
    if (!draft.isCurrent && endText.trim() && !isMonthYearValid(endText)) return false
    if (
      !draft.isCurrent &&
      isMonthYearValid(endText) &&
      compareMonthYear(endText, startText) < 0
    ) {
      return false
    }
    return true
  }, [draft.name, draft.isCurrent, startText, endText])

  const dateError = useMemo(() => {
    if (draft.isCurrent) return null
    if (!isMonthYearValid(endText) || !isMonthYearValid(startText)) return null
    if (compareMonthYear(endText, startText) < 0) {
      return "La date de fin doit être postérieure ou égale à la date de début."
    }
    return null
  }, [draft.isCurrent, endText, startText])

  const handleStartChange = (value: string) => {
    setStartText(value)
    const parsed = parseMonthYear(value)
    if (!parsed.month || !parsed.year) return
    setDraft((prev) => ({
      ...prev,
      startMonth: parsed.month,
      startYear: parsed.year,
    }))
  }

  const handleEndChange = (value: string) => {
    setEndText(value)
    const parsed = parseMonthYear(value)
    if (!parsed.month || !parsed.year) return
    setDraft((prev) => ({
      ...prev,
      endMonth: parsed.month,
      endYear: parsed.year,
    }))
  }

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
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={nameRef}
            id="edu-form-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Ex. : Master UI/UX Design"
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
          <Label id="edu-form-level-label">Niveau</Label>
          <Select
            value={draft.level || "__none__"}
            items={levelOptions.map((level) => ({ value: level, label: level }))}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                level: !value || value === "__none__" ? "" : value,
              })
            }
          >
            <SelectTrigger
              className="w-full"
              aria-labelledby="edu-form-level-label"
            >
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edu-form-school">École ou organisme</Label>
          <Input
            id="edu-form-school"
            value={draft.school}
            onChange={(e) => setDraft({ ...draft, school: e.target.value })}
            placeholder="Ex. : Université Paris II"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edu-form-start">
            Du <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edu-form-start"
            value={startText}
            onChange={(e) => handleStartChange(e.target.value)}
            placeholder="MM/AAAA"
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.dates)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edu-form-end">Au</Label>
          <Input
            id="edu-form-end"
            value={draft.isCurrent ? "" : endText}
            onChange={(e) => handleEndChange(e.target.value)}
            placeholder="MM/AAAA"
            inputMode="numeric"
            autoComplete="off"
            disabled={draft.isCurrent}
            aria-invalid={Boolean(fieldErrors.dates)}
          />
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <Checkbox
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
              if (isCurrent) setEndText("")
            }}
          />
          <Label htmlFor="edu-form-current" className="mb-0 cursor-pointer">
            J&apos;y étudie toujours
          </Label>
        </div>

        {fieldErrors.dates ? (
          <p className="flex items-center gap-1 text-sm text-destructive sm:col-span-2">
            <AlertCircle className="h-3.5 w-3.5" />
            {fieldErrors.dates}
          </p>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edu-form-desc">Description</Label>
          <Textarea
            id="edu-form-desc"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={5}
            placeholder={
              "Mes apprentissages\n• Apprendre les outils et techniques de conception industrielle.\n• Gérer le processus de développement d'un produit.\n• Appliquer les théories de la culture du design à un projet de conception de produit."
            }
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
      <div className="rounded-[18px] border border-[#2F2F2F] bg-[#212121] p-6">
        <p className="text-base font-medium text-[#FAFAFA]">Supprimer cette formation ?</p>
        <p className="mt-1 text-sm text-[#A1A1A1]">
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
    <article className="rounded-[18px] border border-[#2F2F2F] bg-[#212121] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-lg font-semibold text-[#FAFAFA]">
            {entry.name || "Formation"}
          </h3>
          {entry.school ? (
            <p className="text-base font-medium text-[#FAFAFA]">{entry.school}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-base text-[#A1A1A1]">
            <span>{formatPeriodDisplay(entry)}</span>
            {entry.level ? (
              <>
                <span aria-hidden>·</span>
                <span>{entry.level}</span>
              </>
            ) : null}
            {entry.isCurrent ? (
              <span className="inline-flex items-center rounded-full bg-[#142B24] px-2 py-0.5 text-xs font-medium text-[#00D492]">
                En cours
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEdit(entry)}
            className="h-12 gap-2 border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] px-4 text-base font-medium text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]"
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Supprimer ${entry.name}`}
            onClick={() => setConfirmDelete(true)}
            className="h-12 w-12 border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {description ? (
        <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[#A1A1A1]">
          {description}
        </p>
      ) : null}
      {needsClamp ? (
        <button
          type="button"
          className="mt-1 text-sm font-medium text-[#00D492] hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </button>
      ) : null}
    </article>
  )
}
