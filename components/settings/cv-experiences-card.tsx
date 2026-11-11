"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2, X, ChevronUp, ChevronDown, Building2 } from "lucide-react"
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
  EMPLOYMENT_TYPE_OPTIONS,
  MAX_HIGHLIGHTS,
  MONTH_OPTIONS,
  clampHighlights,
  emptyCvExperience,
  formatMonthYear,
  isMonthYearValid,
  parseMonthYear,
  type CvEmploymentType,
  type CvExperience,
} from "@/lib/cv/experiences"

type CvExperiencesCardProps = {
  experiences: CvExperience[]
  onChange: (experiences: CvExperience[]) => void
}

function compareMonthYear(left: string, right: string) {
  const a = parseMonthYear(left)
  const b = parseMonthYear(right)
  if (a.year !== b.year) return a.year < b.year ? -1 : 1
  if (a.month === b.month) return 0
  return a.month < b.month ? -1 : 1
}

export function CvExperiencesCard({ experiences, onChange }: CvExperiencesCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [draft, setDraft] = useState<CvExperience | null>(null)
  const [skillInput, setSkillInput] = useState("")
  const [startText, setStartText] = useState("")
  const [endText, setEndText] = useState("")
  const [startTouched, setStartTouched] = useState(false)
  const [endTouched, setEndTouched] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const loadedIdRef = useRef<string | null>(null)

  const canSave = useMemo(() => {
    if (!draft) return false
    if (!isMonthYearValid(startText)) return false
    if (!draft.isCurrent && endText.trim() && !isMonthYearValid(endText)) return false
    if (!draft.isCurrent && isMonthYearValid(endText) && compareMonthYear(endText, startText) < 0) {
      return false
    }
    return (
      draft.title.trim().length > 0 &&
      draft.organization.trim().length > 0
    )
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
      window.requestAnimationFrame(() => titleRef.current?.focus())
    }
  }, [draft, editingId])

  function updateDraft<K extends keyof CvExperience>(key: K, value: CvExperience[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function handleStartChange(value: string) {
    const parsed = parseMonthYear(value)
    setStartText(parsed.month && parsed.year ? formatMonthYear(parsed.month, parsed.year) : "")
    setDraft((prev) =>
      prev ? { ...prev, startMonth: parsed.month, startYear: parsed.year } : prev
    )
  }

  function handleEndChange(value: string) {
    const parsed = parseMonthYear(value)
    setEndText(parsed.month && parsed.year ? formatMonthYear(parsed.month, parsed.year) : "")
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            endMonth: parsed.month,
            endYear: parsed.year,
            isCurrent: parsed.month && parsed.year ? false : prev.isCurrent,
          }
        : prev
    )
  }

  function handleAddExperience() {
    const next: CvExperience = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `exp-${Date.now()}`,
      ...emptyCvExperience(),
    }
    setDraft(next)
    setEditingId(next.id)
    setIsNewDraft(true)
    setSkillInput("")
    onChange([next, ...experiences])
  }

  function handleSave() {
    if (!draft || !canSave) {
      toast.error("Intitulé, entreprise, date de début (MM/AAAA) et date de fin cohérente sont requis")
      return
    }
    const saved: CvExperience = {
      ...draft,
      title: draft.title.trim(),
      organization: draft.organization.trim(),
      location: draft.location.trim(),
      highlights: draft.highlights.trim(),
    }
    onChange(experiences.map((item) => (item.id === saved.id ? saved : item)))
    setDraft(null)
    setEditingId(null)
    setIsNewDraft(false)
    setSkillInput("")
    loadedIdRef.current = null
    toast.success("Expérience enregistrée")
  }

  function handleCancel() {
    if (!draft) return
    const isEmpty =
      !draft.title.trim() &&
      !draft.organization.trim() &&
      !draft.highlights.trim()
    if (isEmpty) {
      onChange(experiences.filter((item) => item.id !== draft.id))
    }
    setDraft(null)
    setEditingId(null)
    setIsNewDraft(false)
    setSkillInput("")
    loadedIdRef.current = null
  }

  function handleRemoveExperience(id: string) {
    onChange(experiences.filter((experience) => experience.id !== id))
    if (draft?.id === id) {
      setDraft(null)
      setEditingId(null)
      setIsNewDraft(false)
      loadedIdRef.current = null
    }
  }

  function handleAddSkill() {
    if (!draft) return
    const skill = skillInput.trim()
    if (!skill) return
    if (draft.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      toast.error("Cette compétence est déjà ajoutée")
      return
    }
    updateDraft("skills", [...draft.skills, skill])
    setSkillInput("")
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded-[8px] border-[1.25px] border-[#525252] bg-[#171717] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-medium leading-6 tracking-[-0.02em] text-white">Expériences</h2>
          <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-[#d4d4d4]">
            Ajoute tes postes — utilise les flèches pour réorganiser l&apos;ordre.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleAddExperience}
          className="h-[46px] gap-2 border-[1.25px] border-[#737373] bg-[#262626] px-4 text-sm font-medium text-[#d4d4d4] hover:bg-[#404040]"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Ajouter une expérience
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {experiences.length === 0 ? (
          <div className="rounded-[8px] border border-[#404040] bg-[#171717] p-4 text-center">
            <p className="text-base text-[#A1A1A1]">Aucune expérience ajoutée pour l&apos;instant.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 gap-2 border-[rgba(255,255,255,0.149)] bg-[rgba(255,255,255,0.045)] px-4 text-base font-medium text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.08)]"
              onClick={handleAddExperience}
            >
              <Plus className="h-4 w-4" />
              Ajouter une expérience
            </Button>
          </div>
) : (
          <ul className="space-y-4">
            {experiences.map((experience, index) => {
              const isEditing = draft?.id === experience.id
              if (isEditing && draft) {
                return (
                  <li key={experience.id}>
                    <div className="space-y-5 rounded-[8px] border border-[#404040] bg-[#171717] p-4">
                    <h3 className="text-lg font-medium leading-6 tracking-[-0.02em] text-white">Édition de l&apos;expérience</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <Label htmlFor={`exp-title-${draft.id}`} className="mb-0 text-base">
                          Titre, rôle ou nom du projet *
                        </Label>
                        <Input
                          ref={titleRef}
                          id={`exp-title-${draft.id}`}
                          value={draft.title}
                          onChange={(e) => updateDraft("title", e.target.value)}
                          placeholder="Ex. : Product Manager"
                           className="h-[50px] rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base dark:bg-[#262626]"
                        />
                      </Field>
                      <Field className="sm:col-span-2">
                        <Label htmlFor={`exp-org-${draft.id}`} className="mb-0 text-base">
                          Entreprise ou client *
                        </Label>
                        <Input
                          id={`exp-org-${draft.id}`}
                          value={draft.organization}
                          onChange={(e) => updateDraft("organization", e.target.value)}
                          placeholder="Ex. : Welcome to the Jungle"
                           className="h-[50px] rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base dark:bg-[#262626]"
                        />
                      </Field>
                      <Field>
                        <Label htmlFor={`exp-location-${draft.id}`} className="mb-0 text-base">
                          Localisation
                        </Label>
                        <Input
                          id={`exp-location-${draft.id}`}
                          value={draft.location}
                          onChange={(e) => updateDraft("location", e.target.value)}
                          placeholder="Ex. : Paris, Île-de-France, France"
                          aria-describedby={`exp-location-hint-${draft.id}`}
                           className="h-[50px] rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base dark:bg-[#262626]"
                        />
                        <p
                          id={`exp-location-hint-${draft.id}`}
                          className="text-sm text-muted-foreground"
                        >
                          Ville, région, pays
                        </p>
                      </Field>
                      <Field>
                        <Label id={`exp-contract-label-${draft.id}`} className="mb-0 text-base">
                          Type de contrat
                        </Label>
                        <Select
                          value={draft.employmentType || "__none__"}
                          items={EMPLOYMENT_TYPE_OPTIONS.map((option) => ({
                            value: option.value || "__none__",
                            label: option.value ? option.label : "Sélectionnez",
                          }))}
                          onValueChange={(value) =>
                            updateDraft(
                              "employmentType",
                              (!value || value === "__none__"
                                ? ""
                                : value) as CvEmploymentType
                            )
                          }
                        >
                          <SelectTrigger
                             className="h-[50px] w-full rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base dark:bg-[#262626]"
                            aria-labelledby={`exp-contract-label-${draft.id}`}
                          >
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                          <SelectContent>
                            {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value || "none"}
                                value={option.value || "__none__"}
                              >
                                {option.value ? option.label : "Sélectionnez"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <Label htmlFor={`exp-start-${draft.id}`} className="mb-0 text-base">
                          Du *
                        </Label>
                        <MonthYearDatePicker
                          id={`exp-start-${draft.id}`}
                          value={draft.startYear && draft.startMonth ? `${draft.startYear}-${draft.startMonth}` : ""}
                          onChange={handleStartChange}
                          onBlur={() => setStartTouched(true)}
                          label="la date de début"
                          invalid={Boolean(startError)}
                          describedBy={startError ? `exp-start-error-${draft.id}` : undefined}
                        />
                        {startError ? (
                          <p
                            id={`exp-start-error-${draft.id}`}
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {startError}
                          </p>
                        ) : null}
                      </Field>
                      <Field>
                        <Label htmlFor={`exp-end-${draft.id}`} className="mb-0 text-base">
                          Au
                        </Label>
                        <MonthYearDatePicker
                          id={`exp-end-${draft.id}`}
                          value={draft.endYear && draft.endMonth ? `${draft.endYear}-${draft.endMonth}` : ""}
                          onChange={handleEndChange}
                          onBlur={() => setEndTouched(true)}
                          label="la date de fin"
                          min={draft.startYear && draft.startMonth ? `${draft.startYear}-${draft.startMonth}` : undefined}
                          invalid={Boolean(endError)}
                          describedBy={endError ? `exp-end-error-${draft.id}` : undefined}
                        />
                        {endError ? (
                          <p
                            id={`exp-end-error-${draft.id}`}
                            role="alert"
                            className="text-sm text-destructive"
                          >
                            {endError}
                          </p>
                        ) : null}
                      </Field>
                      <Field className="sm:col-span-2">
                        <Label htmlFor={`exp-highlights-${draft.id}`} className="mb-0 text-base">
                          Description, missions
                        </Label>
                        <Textarea
                          id={`exp-highlights-${draft.id}`}
                          value={draft.highlights}
                          onChange={(e) =>
                            updateDraft(
                              "highlights",
                              clampHighlights(e.target.value)
                            )
                          }
                          rows={5}
                          placeholder={
                            "Mes réalisations\n• Mise en place du Design System qui a réduit de 30% le temps de delivery de l’équipe Design.\n• Conception de deux applications du portfolio qui a permis l’acquisition de 120 nouveaux clients"
                          }
                           className="min-h-[95px] rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base leading-6 dark:bg-[#262626]"
                        />
                        <p className="text-base text-muted-foreground">
                          {draft.highlights.length}/{MAX_HIGHLIGHTS}
                        </p>
                      </Field>
                      <Field className="sm:col-span-2">
                        <Label className="mb-0 text-base">Compétences</Label>
                        <div className="flex gap-2">
                          <Input
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Ajouter une compétence"
                             className="h-[50px] rounded-[8px] border-[1.25px] border-[#525252] bg-[#262626] text-base dark:bg-[#262626]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleAddSkill()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={handleAddSkill}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Ajouter
                          </Button>
                        </div>
                        {draft.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {draft.skills.map((skill) => (
                              <Badge key={skill} variant="chip" className="gap-1.5">
                                {skill}
                                <button
                                  type="button"
                                  aria-label={`Retirer ${skill}`}
                                  onClick={() =>
                                    updateDraft(
                                      "skills",
                                      draft.skills.filter((item) => item !== skill)
                                    )
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </Field>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={handleCancel}
                        className="h-[50px] rounded-[8px] border-[1.25px] border-[#a3a3a3] bg-[#161616] px-4 text-sm font-medium text-white hover:bg-[#262626]"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="h-[50px] rounded-[8px] bg-white px-4 text-sm font-medium text-[#0a0a0a] hover:bg-[#d4d4d4]"
                      >
                        {isNewDraft ? "Ajouter" : "Modifier"}
                      </Button>
</div>
                    </div>
                </li>
              )
            }

            return (
                <li key={experience.id}>
                  <div className="w-full rounded-[8px] border border-[#404040] bg-[#171717] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-white">
                        {experience.title || "Nouvelle expérience"}
                      </p>
                      <p className="text-base leading-6 text-[#a3a3a3]">
                        {[
                          experience.startMonth
                            ? MONTH_OPTIONS.find(
                                (m) => m.value === experience.startMonth
                              )?.label
                            : null,
                          experience.startYear,
                          "→",
                          experience.isCurrent
                            ? "présent"
                            : [
                                MONTH_OPTIONS.find(
                                  (m) => m.value === experience.endMonth
                                )?.label,
                                experience.endYear,
                              ]
                                .filter(Boolean)
                                .join(" "),
                          experience.location,
                        ]
                        .filter(Boolean)
                        .join(" · ")}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {experience.organization ? (
                          <Badge variant="secondary" className="gap-1.5 rounded-[8px] bg-[#262626] text-base font-medium text-white">
                            <Building2 className="h-4 w-4" aria-hidden />
                            {experience.organization}
                          </Badge>
                        ) : null}
                        {experience.employmentType ? (
                          <Badge variant="secondary" className="rounded-[8px] bg-[#262626] text-base font-medium text-white">
                            {experience.employmentType}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDraft(experience)
                          setEditingId(experience.id)
                          setIsNewDraft(false)
                          setSkillInput("")
                        }}
                        className="h-[46px] gap-2 border-[1.25px] border-[#525252] bg-[#262626] px-4 text-sm font-medium text-[#a3a3a3] hover:bg-[#404040]"
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (index > 0) {
                            const next = [...experiences]
                            const [moved] = next.splice(index, 1)
                            next.splice(index - 1, 0, moved)
                            onChange(next)
                          }
                        }}
                        disabled={index === 0}
                        aria-label="Monter"
                        className="h-[46px] w-[46px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:bg-[#404040] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (index < experiences.length - 1) {
                            const next = [...experiences]
                            const [moved] = next.splice(index, 1)
                            next.splice(index + 1, 0, moved)
                            onChange(next)
                          }
                        }}
                        disabled={index === experiences.length - 1}
                        aria-label="Descendre"
                        className="h-[46px] w-[46px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:bg-[#404040] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveExperience(experience.id)}
                        aria-label={`Supprimer ${experience.title}`}
                        className="h-[46px] w-[46px] border-[1.25px] border-[#525252] bg-[#262626] text-[#d4d4d4] hover:bg-[#404040]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {experience.highlights.trim() ? (
                    <p className="mt-4 whitespace-pre-wrap text-base leading-6 text-[#d4d4d4]">
                      {experience.highlights.trim()}
                    </p>
                  ) : null}

                  {experience.skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {experience.skills.map((skill) => (
                        <Badge key={skill} variant="tag">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
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
