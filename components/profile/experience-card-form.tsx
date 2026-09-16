"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
  EMPLOYMENT_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  MAX_HIGHLIGHTS,
  MONTH_OPTIONS,
  clampHighlights,
  type CvEmploymentType,
  type CvLocationType,
} from "@/lib/cv/experiences"
import type { ProfileExperienceEntry } from "@/lib/profile/types"
import { PROFILE_SKILL_SUGGESTIONS } from "@/lib/profile/suggestion-catalogs"

type ExperienceCardFormProps = {
  initial?: ProfileExperienceEntry | null
  onSave: (entry: ProfileExperienceEntry) => void
  onCancel: () => void
}

const yearOptions = (() => {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let year = current + 1; year >= current - 40; year -= 1) {
    years.push(String(year))
  }
  return years
})()

function toDraft(initial?: ProfileExperienceEntry | null): ProfileExperienceEntry {
  if (initial) return { ...initial, skills: [...initial.skills] }
  return {
    id: crypto.randomUUID(),
    title: "",
    organization: "",
    location: "",
    locationType: "",
    employmentType: "",
    isCurrent: false,
    startMonth: String(new Date().getMonth() + 1).padStart(2, "0"),
    startYear: String(new Date().getFullYear()),
    endMonth: "",
    endYear: "",
    highlights: "",
    skills: [],
  }
}

export function ExperienceCardForm({
  initial,
  onSave,
  onCancel,
}: ExperienceCardFormProps) {
  const [draft, setDraft] = useState<ProfileExperienceEntry>(() => toDraft(initial))
  const [skillInput, setSkillInput] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const isEdit = Boolean(initial)

  useEffect(() => {
    window.requestAnimationFrame(() => titleRef.current?.focus())
  }, [])

  const canSave = useMemo(() => {
    return (
      draft.title.trim().length > 0 &&
      draft.organization.trim().length > 0 &&
      draft.startYear.trim().length > 0
    )
  }, [draft])

  const skillOptions = useMemo(
    () =>
      [
        ...new Set([...PROFILE_SKILL_SUGGESTIONS, ...draft.skills]),
      ] as string[],
    [draft.skills]
  )

  function updateDraft<K extends keyof ProfileExperienceEntry>(
    key: K,
    value: ProfileExperienceEntry[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!draft.title.trim()) {
      newErrors.title = "L'intitulé du poste est requis"
    }
    if (!draft.organization.trim()) {
      newErrors.organization = "L'entreprise est requise"
    }
    if (!draft.startYear.trim()) {
      newErrors.startYear = "L'année de début est requise"
    }

    if (!draft.isCurrent && draft.startYear && draft.endYear) {
      const startDate = new Date(
        Number(draft.startYear),
        draft.startMonth ? Number(draft.startMonth) - 1 : 0
      )
      const endDate = new Date(
        Number(draft.endYear),
        draft.endMonth ? Number(draft.endMonth) - 1 : 0
      )
      if (endDate < startDate) {
        newErrors.endDate = "La date de fin ne peut pas être antérieure à la date de début"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      onSave({
        ...draft,
        title: draft.title.trim(),
        organization: draft.organization.trim(),
        location: draft.location.trim(),
        highlights: draft.highlights.trim(),
      })
    } catch {
      toast.error("Erreur lors de l'enregistrement. Veuillez réessayer.")
    } finally {
      setSaving(false)
    }
  }

  function handleAddSkill() {
    const skill = skillInput.trim()
    if (!skill) return
    if (draft.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      toast.error("Cette compétence est déjà ajoutée")
      return
    }
    updateDraft("skills", [...draft.skills, skill])
    setSkillInput("")
  }

  function handleRemoveSkill(skill: string) {
    updateDraft(
      "skills",
      draft.skills.filter((item) => item !== skill)
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-[#171717] p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">
        {isEdit ? "Modifier l'expérience" : "Nouvelle expérience"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Intitulé du poste */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-card-title">
            Intitulé du poste <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={titleRef}
            id="exp-card-title"
            value={draft.title}
            onChange={(e) => updateDraft("title", e.target.value)}
            placeholder="Product Manager"
            aria-invalid={Boolean(errors.title)}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Entreprise */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-card-org">
            Entreprise <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-card-org"
            value={draft.organization}
            onChange={(e) => updateDraft("organization", e.target.value)}
            placeholder="Welcome to the Jungle"
            aria-invalid={Boolean(errors.organization)}
            className={errors.organization ? "border-destructive" : ""}
          />
          {errors.organization && (
            <p className="text-sm text-destructive">{errors.organization}</p>
          )}
        </div>

        {/* Type d'emploi */}
        <div className="space-y-2">
          <Label>Type d&apos;emploi</Label>
          <Select
            value={draft.employmentType || "__none__"}
            onValueChange={(value) =>
              updateDraft(
                "employmentType",
                (!value || value === "__none__" ? "" : value) as CvEmploymentType
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value || "none"}
                  value={option.value || "__none__"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode de travail */}
        <div className="space-y-2">
          <Label>Mode de travail</Label>
          <Select
            value={draft.locationType || "__none__"}
            onValueChange={(value) =>
              updateDraft(
                "locationType",
                (!value || value === "__none__" ? "" : value) as CvLocationType
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TYPE_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value || "none"}
                  value={option.value || "__none__"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Localisation */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-card-location">Ville / pays</Label>
          <Input
            id="exp-card-location"
            value={draft.location}
            onChange={(e) => updateDraft("location", e.target.value)}
            placeholder="Paris, France"
          />
        </div>

        {/* Période */}
        <div className="space-y-3 sm:col-span-2">
          <Label>Période</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="exp-card-start-month" className="text-sm text-muted-foreground">
                  Mois
                </Label>
                <Select
                  value={draft.startMonth}
                  onValueChange={(value) => updateDraft("startMonth", value ?? "")}
                >
                  <SelectTrigger id="exp-card-start-month" className="w-full">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-card-start-year" className="text-sm text-muted-foreground">
                  Année <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={draft.startYear}
                  onValueChange={(value) => updateDraft("startYear", value ?? "")}
                >
                  <SelectTrigger
                    id="exp-card-start-year"
                    className="w-full"
                    aria-invalid={Boolean(errors.startYear)}
                  >
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
                {errors.startYear && (
                  <p className="text-sm text-destructive">{errors.startYear}</p>
                )}
              </div>
            </div>

            {!draft.isCurrent ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="exp-card-end-month" className="text-sm text-muted-foreground">
                    Mois
                  </Label>
                  <Select
                    value={draft.endMonth || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endMonth", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger id="exp-card-end-month" className="w-full">
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-card-end-year" className="text-sm text-muted-foreground">
                    Année
                  </Label>
                  <Select
                    value={draft.endYear || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endYear", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="exp-card-end-year"
                      className="w-full"
                      aria-invalid={Boolean(errors.endDate)}
                    >
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.endDate && (
                    <p className="text-sm text-destructive">{errors.endDate}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 self-end pb-2">
                <Checkbox id="exp-card-current-check" checked disabled />
                <Label htmlFor="exp-card-current-check" className="mb-0 text-muted-foreground">
                  Aujourd&apos;hui
                </Label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="exp-card-current"
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
            <Label htmlFor="exp-card-current" className="mb-0 cursor-pointer text-sm">
              J&apos;occupe actuellement ce poste
            </Label>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="exp-card-highlights">Description</Label>
          <Textarea
            id="exp-card-highlights"
            value={draft.highlights}
            onChange={(e) =>
              updateDraft("highlights", clampHighlights(e.target.value))
            }
            rows={5}
            placeholder="Décrivez vos missions, vos réalisations et leurs résultats"
            className="min-h-[120px] text-base leading-relaxed"
          />
          <p className="text-sm text-muted-foreground">
            {draft.highlights.length}/{MAX_HIGHLIGHTS}
          </p>
        </div>

        {/* Compétences */}
        <div className="space-y-2 sm:col-span-2">
          <Label>Compétences associées</Label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Ajouter une compétence"
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
              onClick={handleAddSkill}
            >
              <Plus className="mr-1 h-4 w-4" />
              Ajouter
            </Button>
          </div>
          {draft.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {draft.skills.map((skill) => (
                <Badge key={skill} variant="chip" className="gap-1.5">
                  {skill}
                  <button
                    type="button"
                    aria-label={`Retirer ${skill}`}
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? "Enregistrement…" : isEdit ? "Enregistrer les modifications" : "Enregistrer l'expérience"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Annuler
        </Button>
      </div>
    </div>
  )
}
