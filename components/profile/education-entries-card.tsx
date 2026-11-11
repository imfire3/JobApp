"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown, GraduationCap } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
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
import { MonthYearDatePicker } from "@/components/profile/month-year-date-picker"
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

type EducationEntriesCardProps = {
  entries: ProfileEducationEntry[]
  onChange: (entries: ProfileEducationEntry[]) => void
}

function compareMonthYear(left: string, right: string) {
  const a = parseMonthYear(left)
  const b = parseMonthYear(right)
  if (a.year !== b.year) return a.year < b.year ? -1 : 1
  if (a.month === b.month) return 0
  return a.month < b.month ? -1 : 1
}

export function EducationEntriesCard({
  entries,
  onChange,
}: EducationEntriesCardProps) {
  const [draft, setDraft] = useState<ProfileEducationEntry | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [startText, setStartText] = useState("")
  const [endText, setEndText] = useState("")
  const [startTouched, setStartTouched] = useState(false)
  const [endTouched, setEndTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const loadedIdRef = useRef<string | null>(null)

  const draftLevel = draft?.level ?? ""

  const levelOptions = useMemo(() => {
    if (draftLevel && !EDUCATION_LEVEL_OPTIONS.includes(draftLevel)) {
      return [...EDUCATION_LEVEL_OPTIONS, draftLevel]
    }
    return EDUCATION_LEVEL_OPTIONS
  }, [draftLevel])

  const canSave = useMemo(() => {
    if (!draft) return false
    if (!isMonthYearValid(startText)) return false
    if (!draft.isCurrent && endText.trim() && !isMonthYearValid(endText)) return false
    if (
      !draft.isCurrent &&
      isMonthYearValid(endText) &&
      compareMonthYear(endText, startText) < 0
    ) {
      return false
    }
    return draft.name.trim().length > 0
  }, [draft, startText, endText])

  const startError = useMemo(() => {
    if (!startText.trim()) {
      return startTouched ? "La date de début est requise." : null
    }
    if (!isMonthYearValid(startText)) return "Saisis une date au format MM/AAAA."
    return null
  }, [startText, startTouched])

  const endError = useMemo(() => {
    if (!draft || draft.isCurrent) return null
    if (!endText.trim()) {
      return endTouched ? "La date de fin est requise." : null
    }
    if (!isMonthYearValid(endText)) return "Saisis une date au format MM/AAAA."
    if (isMonthYearValid(startText) && compareMonthYear(endText, startText) < 0) {
      return "La date de fin doit être postérieure à la date de début."
    }
    return null
  }, [draft, endText, endTouched, startText])

  useEffect(() => {
    if (!draft) return
    if (loadedIdRef.current === draft.id) return
    loadedIdRef.current = draft.id
    setStartText(formatMonthYear(draft.startMonth, draft.startYear))
    setEndText(formatMonthYear(draft.endMonth, draft.endYear))
    setStartTouched(false)
    setEndTouched(false)
  }, [draft])

  useEffect(() => {
    if (draft && editingId === draft.id) {
      window.requestAnimationFrame(() => nameRef.current?.focus())
    }
  }, [draft, editingId])

  const handleAdd = () => {
    const next = emptyEducationEntry()
    setDraft(next)
    setEditingId(next.id)
    setIsNewDraft(true)
    loadedIdRef.current = null
    onChange([next, ...entries])
  }

  const handleStartChange = (value: string) => {
    const parsed = parseMonthYear(value)
    setStartText(parsed.month && parsed.year ? `${parsed.month}/${parsed.year}` : "")
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            startMonth: parsed.month,
            startYear: parsed.year,
          }
        : prev
    )
  }

  const handleEndChange = (value: string) => {
    const parsed = parseMonthYear(value)
    setEndText(parsed.month && parsed.year ? `${parsed.month}/${parsed.year}` : "")
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            endMonth: parsed.month,
            endYear: parsed.year,
            isCurrent: !(parsed.month && parsed.year),
          }
        : prev
    )
  }

  const handleSaveDraft = () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast.error("Le nom du diplôme est requis")
      return
    }
    if (!canSave) {
      toast.error("Vérifie les dates (MM/AAAA) avant d’enregistrer")
      return
    }
    onChange(
      entries.map((entry) =>
        entry.id === draft.id
          ? {
              ...draft,
              name: draft.name.trim(),
              school: draft.school.trim(),
              description: draft.description.trim(),
            }
          : entry
      )
    )
    setDraft(null)
    setEditingId(null)
    setIsNewDraft(false)
    loadedIdRef.current = null
    toast.success("Diplôme enregistré")
  }

  const handleRemove = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
    if (draft?.id === id) {
      setDraft(null)
      setEditingId(null)
      setIsNewDraft(false)
      loadedIdRef.current = null
    }
  }

  return (
    <div className="flex max-h-full w-full min-h-0 flex-col gap-6 rounded-[8px] border-[1.25px] border-[#525252] bg-[#171717] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-medium leading-6 tracking-[-0.02em] text-white">Diplômes &amp; formations</h2>
          <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-[#d4d4d4]">
            Listez vos diplômes, formations et certifications pertinents.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          className="h-12 gap-2 rounded-[8px] border-[1.25px] border-[#a3a3a3] bg-[#262626] px-4 text-sm font-medium text-[#fafafa] hover:bg-[#333]"
        >
          <Plus className="h-4 w-4" />
          Ajouter un diplôme
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="rounded-[8px] border border-[#525252] bg-[#171717] p-4 text-center">
            <p className="text-base leading-6 text-[#a3a3a3]">Aucun diplôme pour l&apos;instant.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-12 gap-2 rounded-[8px] border-[1.25px] border-[#a3a3a3] bg-[#262626] px-4 text-sm font-medium text-[#fafafa] hover:bg-[#333]"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
              Ajouter un diplôme
            </Button>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry, index) => {
              const isEditing = draft?.id === entry.id
              if (isEditing && draft) {
                return (
                  <li key={draft.id}>
                    <div className="space-y-6 rounded-[16px] border-[1.25px] border-[#404040] bg-[#212121] p-4">
                    <h3 className="text-xl font-medium leading-6 tracking-[-0.02em] text-white">{isNewDraft ? "Ajouter un diplôme" : "Édition du diplôme"}</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <Label htmlFor={`edu-name-${draft.id}`} className="mb-0 text-base">
                          Nom de la formation
                        </Label>
                        <Input
                          ref={nameRef}
                          id={`edu-name-${draft.id}`}
                          value={draft.name}
                          onChange={(e) =>
                            setDraft({ ...draft, name: e.target.value })
                          }
                          placeholder="Ex. : Master UI/UX Design"
                          className="h-[50px] rounded-[8px] border-[1.25px] border-[#737373] bg-[#262626] text-base dark:bg-[#262626]"
                        />
                      </Field>
                      <Field>
                        <Label
                          id={`edu-level-label-${draft.id}`}
                          className="mb-0 text-base"
                        >
                          Niveau
                        </Label>
                        <Select
                          value={draft.level || "__none__"}
                          items={levelOptions.map((level) => ({
                            value: level,
                            label: level,
                          }))}
                          onValueChange={(value) =>
                            setDraft({
                              ...draft,
                              level: !value || value === "__none__" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger
                          className="h-[50px] w-full rounded-[8px] border-[1.25px] border-[#737373] bg-[#262626] text-base dark:bg-[#262626]"
                            aria-labelledby={`edu-level-label-${draft.id}`}
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
                      </Field>
                      <Field>
                        <Label
                          htmlFor={`edu-school-${draft.id}`}
                          className="mb-0 text-base"
                        >
                          École ou organisme
                        </Label>
                        <Input
                          id={`edu-school-${draft.id}`}
                          value={draft.school}
                          onChange={(e) =>
                            setDraft({ ...draft, school: e.target.value })
                          }
                          placeholder="Ex. : Université Paris II"
                          className="h-[50px] rounded-[8px] border-[1.25px] border-[#737373] bg-[#262626] text-base dark:bg-[#262626]"
                        />
                      </Field>
                      <Field>
                        <Label
                          htmlFor={`edu-start-${draft.id}`}
                          className="mb-0 text-base"
                        >
                          Du *
                        </Label>
                        <MonthYearDatePicker
                          id={`edu-start-${draft.id}`}
                          value={draft.startYear && draft.startMonth ? `${draft.startYear}-${draft.startMonth}` : ""}
                          onChange={handleStartChange}
                          onBlur={() => setStartTouched(true)}
                          label="la date de début"
                          invalid={Boolean(startError)}
                          describedBy={startError ? `edu-start-error-${draft.id}` : undefined}
                        />
                        {startError ? (
                          <p
                            id={`edu-start-error-${draft.id}`}
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {startError}
                          </p>
                        ) : null}
                      </Field>
                      <Field>
                        <Label
                          htmlFor={`edu-end-${draft.id}`}
                          className="mb-0 text-base"
                        >
                          Au
                        </Label>
                        <MonthYearDatePicker
                          id={`edu-end-${draft.id}`}
                          value={draft.endYear && draft.endMonth ? `${draft.endYear}-${draft.endMonth}` : ""}
                          onChange={handleEndChange}
                          onBlur={() => setEndTouched(true)}
                          label="la date de fin"
                          min={draft.startYear && draft.startMonth ? `${draft.startYear}-${draft.startMonth}` : undefined}
                          invalid={Boolean(endError)}
                          describedBy={endError ? `edu-end-error-${draft.id}` : undefined}
                        />
                        {endError ? (
                          <p
                            id={`edu-end-error-${draft.id}`}
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {endError}
                          </p>
                        ) : null}
                      </Field>
                      <Field className="sm:col-span-2">
                        <Label
                          htmlFor={`edu-desc-${draft.id}`}
                          className="mb-0 text-base"
                        >
                          Description
                        </Label>
                        <Textarea
                          id={`edu-desc-${draft.id}`}
                          value={draft.description}
                          onChange={(e) =>
                            setDraft({ ...draft, description: e.target.value })
                          }
                          rows={5}
                          placeholder={
                            "Mes apprentissages\n• Apprendre les outils et techniques de conception industrielle.\n• Gérer le processus de développement d'un produit.\n• Appliquer les théories de la culture du design à un projet de conception de produit."
                          }
                          className="min-h-[95px] rounded-[8px] border-[1.25px] border-[#737373] bg-[#262626] text-base leading-6 dark:bg-[#262626]"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!draft.name.trim()) {
                            handleRemove(draft.id)
                            return
                          }
                          setDraft(null)
                          setEditingId(null)
                          setIsNewDraft(false)
                          loadedIdRef.current = null
                        }}
                        className="h-[50px] rounded-[8px] border-[1.25px] border-[#a3a3a3] bg-[#262626] px-4 text-sm font-medium text-[#d4d4d4] hover:bg-[#333]"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={!canSave}
                        className="h-[50px] rounded-[8px] bg-white px-4 text-sm font-medium text-[#0a0a0a] hover:bg-[#e5e5e5]"
                      >
                        {isNewDraft ? "Ajouter" : "Modifier"}
                      </Button>
                    </div>
                    </div>
                  </li>
                )
            }

            return (
                <li key={entry.id}>
                  <div className="w-full rounded-[8px] border-[1.25px] border-[#525252] bg-[#171717] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xl font-medium leading-6 tracking-[-0.02em] text-white">
                          {entry.name || "Nouveau diplôme"}
                        </p>
                        <p className="text-base leading-6 text-[#a3a3a3]">
                          {(() => {
                            const month = entry.isCurrent || !entry.endYear ? entry.startMonth : entry.endMonth
                            const year = entry.isCurrent || !entry.endYear ? entry.startYear : entry.endYear
                            return [month ? MONTH_OPTIONS.find((item) => item.value === month)?.label : null, year].filter(Boolean).join(" ") || "Date à compléter"
                          })()}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {entry.school ? (
                            <Badge variant="secondary" className="h-8 gap-1.5 rounded-[8px] bg-[#262626] px-2 text-sm font-medium text-[#fafafa]">
                              <GraduationCap className="size-4" aria-hidden />
                              {entry.school}
                            </Badge>
                          ) : (
                            <span className="text-sm text-[#737373]">École à compléter</span>
                          )}
                          {entry.level ? <Badge variant="secondary" className="h-8 rounded-[8px] bg-[#262626] px-2 text-sm font-medium text-[#a3a3a3]">{entry.level}</Badge> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setDraft(entry)
                          setEditingId(entry.id)
                          setIsNewDraft(false)
                          loadedIdRef.current = null
                        }}
                        className="h-12 rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] px-4 text-sm font-medium text-[#a3a3a3] hover:bg-[#333] hover:text-white"
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (index < entries.length - 1) {
                            const next = [...entries]
                            const [moved] = next.splice(index, 1)
                            next.splice(index + 1, 0, moved)
                            onChange(next)
                          }
                        }}
                        disabled={index === entries.length - 1}
                        aria-label="Descendre"
                        className="size-12 rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (index > 0) {
                            const next = [...entries]
                            const [moved] = next.splice(index, 1)
                            next.splice(index - 1, 0, moved)
                            onChange(next)
                          }
                        }}
                        disabled={index === 0}
                        aria-label="Monter"
                        className="size-12 rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Supprimer ${entry.name}`}
                        onClick={() => handleRemove(entry.id)}
                        className="size-12 rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:border-[#f87171] hover:bg-[#262626] hover:text-[#f87171]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
