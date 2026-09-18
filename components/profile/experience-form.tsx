"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { SearchableSelect } from "@/components/jobs/searchable-multi-select"
import { FRANCE_CITIES } from "@/lib/onboarding/france-cities"
import { PROFILE_SKILL_SUGGESTIONS } from "@/lib/profile/suggestion-catalogs"
import { clampHighlights, MONTH_OPTIONS } from "@/lib/cv/experiences"
import type { ProfileExperienceEntry } from "@/lib/profile/types"
import {
  normalizeSelectValue,
  LOCATION_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  yearOptions,
} from "@/lib/profile/experience-utils"

const MAX_HIGHLIGHTS = 2000

type ExperienceFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ProfileExperienceEntry | null
  onSave: (entry: ProfileExperienceEntry) => void
}

function toDraft(initial?: ProfileExperienceEntry | null): ProfileExperienceEntry {
  if (initial) return { ...initial }
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    title: "",
    organization: "",
    location: "",
    locationType: "",
    employmentType: "",
    isCurrent: false,
    startMonth: String(now.getMonth() + 1).padStart(2, "0"),
    startYear: String(now.getFullYear()),
    endMonth: "",
    endYear: "",
    highlights: "",
    skills: [],
  }
}

function shallowEqual(a: ProfileExperienceEntry, b: ProfileExperienceEntry): boolean {
  return (
    a.title === b.title &&
    a.organization === b.organization &&
    a.location === b.location &&
    a.locationType === b.locationType &&
    a.employmentType === b.employmentType &&
    a.isCurrent === b.isCurrent &&
    a.startMonth === b.startMonth &&
    a.startYear === b.startYear &&
    a.endMonth === b.endMonth &&
    a.endYear === b.endYear &&
    a.highlights === b.highlights &&
    JSON.stringify(a.skills) === JSON.stringify(b.skills)
  )
}

export function ExperienceForm({
  open,
  onOpenChange,
  initial,
  onSave,
}: ExperienceFormProps) {
  const [draft, setDraft] = useState<ProfileExperienceEntry>(() => toDraft(initial))
  const [initialSnapshot, setInitialSnapshot] = useState<ProfileExperienceEntry>(() => toDraft(initial))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [skillInput, setSkillInput] = useState("")
  const [skillSuggestionsOpen, setSkillSuggestionsOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const d = toDraft(initial)
      setDraft(d)
      setInitialSnapshot(d)
      setErrors({})
      setIsSaving(false)
      setSkillInput("")
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open, initial])

  const hasChanges = useMemo(() => !shallowEqual(draft, initialSnapshot), [draft, initialSnapshot])

  const updateField = useCallback(
    <K extends keyof ProfileExperienceEntry>(key: K, value: ProfileExperienceEntry[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }))
      if (errors[key]) setErrors((prev) => ({ next: prev[key], ...prev }))
    },
    [errors]
  )

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!draft.title.trim()) newErrors.title = "L'intitulé du poste est obligatoire."
    if (!draft.organization.trim()) newErrors.organization = "L'organisation est obligatoire."
    if (!draft.startYear.trim()) newErrors.startYear = "L'année de début est requise."
    if (!draft.isCurrent && !draft.endYear.trim() && draft.endMonth.trim()) {
      newErrors.endYear = "L'année de fin est requise."
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [draft])

  const handleSave = useCallback(async () => {
    if (!validate()) {
      const firstErrorField = Object.keys(errors)[0]
      const el = document.getElementById(`exp-${firstErrorField}`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    setIsSaving(true)
    try {
      const entry: ProfileExperienceEntry = {
        ...draft,
        title: draft.title.trim(),
        organization: draft.organization.trim(),
        location: draft.location.trim(),
        highlights: clampHighlights(draft.highlights.trim()),
        endMonth: draft.isCurrent ? "" : draft.endMonth,
        endYear: draft.isCurrent ? "" : draft.endYear,
      }
      onSave(entry)
      toast.success("Expérience mise à jour")
      onOpenChange(false)
    } catch {
      toast.error("Impossible d'enregistrer les modifications. Réessaie.")
    } finally {
      setIsSaving(false)
    }
  }, [draft, validate, errors, onSave, onOpenChange])

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setConfirmClose(true)
    } else {
      onOpenChange(false)
    }
  }, [hasChanges, onOpenChange])

  const handleSkillAdd = useCallback(
    (skill: string) => {
      const trimmed = skill.trim()
      if (!trimmed) return
      if (draft.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        setSkillInput("")
        return
      }
      updateField("skills", [...draft.skills, trimmed])
      setSkillInput("")
    },
    [draft.skills, updateField]
  )

  const handleSkillRemove = useCallback(
    (skill: string) => {
      updateField(
        "skills",
        draft.skills.filter((s) => s !== skill)
      )
    },
    [draft.skills, updateField]
  )

  const skillSuggestions = useMemo(() => {
    const q = skillInput.toLowerCase()
    return PROFILE_SKILL_SUGGESTIONS.filter(
      (s) =>
        s.toLowerCase().includes(q) &&
        !draft.skills.some((existing) => existing.toLowerCase() === s.toLowerCase())
    ).slice(0, 8)
  }, [skillInput, draft.skills])

  const yearOpts = yearOptions()

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-hidden border border-[#383838] bg-[#171717] p-0 sm:max-w-[860px]">
          <div className="flex items-center justify-between border-b border-[#383838] px-6 py-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-[#FAFAFA]">
                Modifier l'expérience
              </DialogTitle>
              {(draft.organization || draft.title) && (
                <p className="mt-0.5 text-sm text-[#A1A1A1]">
                  {[draft.organization, draft.title].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#A1A1A1] transition-colors hover:bg-[#212121] hover:text-[#FAFAFA]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(90vh-130px)] space-y-6 overflow-y-auto px-6 py-6">
            {/* Section 1 — Informations principales */}
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1A1]">
                Informations principales
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="exp-title" className="text-sm font-medium text-[#FAFAFA]">
                  Intitulé du poste *
                </Label>
                <Input
                  ref={titleRef}
                  id="exp-title"
                  value={draft.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Product Owner, Chef de projet..."
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "exp-title-error" : undefined}
                  className="border-[#383838] bg-[#212121] text-[#FAFAFA] placeholder:text-[#A1A1A1] focus-visible:border-[#00D492]"
                />
                {errors.title && (
                  <p id="exp-title-error" className="text-xs text-[#FFB900]">{errors.title}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-organization" className="text-sm font-medium text-[#FAFAFA]">
                  Organisation *
                </Label>
                <Input
                  id="exp-organization"
                  value={draft.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  placeholder="Fortuneo, Alan, Qonto..."
                  aria-invalid={!!errors.organization}
                  aria-describedby={errors.organization ? "exp-organization-error" : undefined}
                  className="border-[#383838] bg-[#212121] text-[#FAFAFA] placeholder:text-[#A1A1A1] focus-visible:border-[#00D492]"
                />
                {errors.organization && (
                  <p id="exp-organization-error" className="text-xs text-[#FFB900]">{errors.organization}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-location" className="text-sm font-medium text-[#FAFAFA]">
                    Localisation
                  </Label>
                  <SearchableSelect
                    id="exp-location"
                    options={
                      draft.location && !(FRANCE_CITIES as readonly string[]).includes(draft.location)
                        ? [draft.location, ...FRANCE_CITIES]
                        : [...FRANCE_CITIES]
                    }
                    value={draft.location}
                    onChange={(city) => updateField("location", city ?? "")}
                    placeholder="Paris, Marseille, Remote..."
                    emptyOptionLabel="Aucune ville"
                    allowCustom
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-location-type" className="text-sm font-medium text-[#FAFAFA]">
                    Type de lieu
                  </Label>
                  <select
                    id="exp-location-type"
                    value={normalizeSelectValue(draft.locationType)}
                    onChange={(e) => updateField("locationType", e.target.value as ProfileExperienceEntry["locationType"])}
                    className="h-11 w-full rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    {LOCATION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-employment-type" className="text-sm font-medium text-[#FAFAFA]">
                  Type d&apos;emploi
                </Label>
                <select
                  id="exp-employment-type"
                  value={normalizeSelectValue(draft.employmentType)}
                  onChange={(e) => updateField("employmentType", e.target.value as ProfileExperienceEntry["employmentType"])}
                  className="h-11 w-full rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </section>

            <Separator className="bg-[#383838]" />

            {/* Section 2 — Période */}
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1A1]">
                Période
              </h3>

              <label className="flex cursor-pointer items-center gap-3">
                <Switch
                  checked={draft.isCurrent}
                  onCheckedChange={(checked) => {
                    updateField("isCurrent", checked)
                  }}
                />
                <span className="text-sm text-[#FAFAFA]">J&apos;occupe actuellement ce poste</span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#FAFAFA]">Début *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={normalizeSelectValue(draft.startMonth)}
                      onChange={(e) => updateField("startMonth", e.target.value)}
                      className="h-11 rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                    >
                      <option value="">Mois</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={normalizeSelectValue(draft.startYear)}
                      onChange={(e) => updateField("startYear", e.target.value)}
                      aria-invalid={!!errors.startYear}
                      className="h-11 rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                    >
                      <option value="">Année</option>
                      {yearOpts.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  {errors.startYear && (
                    <p className="text-xs text-[#FFB900]">{errors.startYear}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-[#FAFAFA]">Fin</Label>
                  {draft.isCurrent ? (
                    <div className="flex h-11 items-center rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#A1A1A1]">
                      Aujourd&apos;hui
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={normalizeSelectValue(draft.endMonth)}
                        onChange={(e) => updateField("endMonth", e.target.value)}
                        className="h-11 rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                      >
                        <option value="">Mois</option>
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <select
                        value={normalizeSelectValue(draft.endYear)}
                        onChange={(e) => updateField("endYear", e.target.value)}
                        aria-invalid={!!errors.endYear}
                        className="h-11 rounded-[10px] border border-[#383838] bg-[#212121] px-3 text-sm text-[#FAFAFA] focus-visible:border-[#00D492] focus-visible:outline-none"
                      >
                        <option value="">Année</option>
                        {yearOpts.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {errors.endYear && (
                    <p className="text-xs text-[#FFB900]">{errors.endYear}</p>
                  )}
                </div>
              </div>
            </section>

            <Separator className="bg-[#383838]" />

            {/* Section 3 — Impact & réalisations */}
            <section className="space-y-4">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1A1]">
                  Impact &amp; réalisations
                </h3>
                <p className="mt-1 text-sm text-[#A1A1A1]">
                  Décris ce que tu as construit, amélioré ou mesuré dans ce poste.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="exp-highlights" className="text-sm font-medium text-[#FAFAFA]">
                    Description
                  </Label>
                  <span className="text-xs text-[#A1A1A1]">
                    {draft.highlights.length}/{MAX_HIGHLIGHTS}
                  </span>
                </div>
                <Textarea
                  id="exp-highlights"
                  value={draft.highlights}
                  onChange={(e) => updateField("highlights", clampHighlights(e.target.value))}
                  rows={6}
                  placeholder="Ex. Refonte du parcours de souscription ayant permis de réduire les abandons de 30%..."
                  className="min-h-[150px] resize-y border-[#383838] bg-[#212121] text-[#FAFAFA] placeholder:text-[#A1A1A1] focus-visible:border-[#00D492]"
                />
                <p className="text-xs text-[#A1A1A1]">
                  Conseil : privilégie des actions concrètes et des résultats mesurables.
                </p>
              </div>
            </section>

            <Separator className="bg-[#383838]" />

            {/* Section 4 — Compétences */}
            <section className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-[#A1A1A1]">
                Compétences
              </h3>

              {draft.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {draft.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="tag"
                      className="gap-1 pr-1"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleSkillRemove(skill)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-[#00D492]/20"
                        aria-label={`Retirer ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Input
                  value={skillInput}
                  onChange={(e) => {
                    setSkillInput(e.target.value)
                    setSkillSuggestionsOpen(true)
                  }}
                  onFocus={() => setSkillSuggestionsOpen(true)}
                  onBlur={() => setTimeout(() => setSkillSuggestionsOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (skillSuggestions.length > 0 && skillInput.trim()) {
                        handleSkillAdd(skillSuggestions[0])
                      } else {
                        handleSkillAdd(skillInput)
                      }
                    }
                    if (e.key === "Backspace" && !skillInput && draft.skills.length > 0) {
                      handleSkillAdd("") 
                      handleSkillRemove(draft.skills[draft.skills.length - 1])
                    }
                    if (e.key === "Escape") setSkillSuggestionsOpen(false)
                  }}
                  placeholder="Rechercher une compétence..."
                  className="border-[#383838] bg-[#212121] text-[#FAFAFA] placeholder:text-[#A1A1A1] focus-visible:border-[#00D492]"
                />
                {skillSuggestionsOpen && skillInput.trim() && skillSuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-[10px] border border-[#383838] bg-[#212121] p-1 text-sm shadow-lg">
                    {skillSuggestions.map((skill) => (
                      <li key={skill}>
                        <button
                          type="button"
                          className="flex w-full rounded-lg px-3 py-2 text-left text-[#FAFAFA] hover:bg-[#171717]"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSkillAdd(skill)}
                        >
                          {skill}
                        </button>
                      </li>
                    ))}
                    {skillInput.trim() &&
                      !PROFILE_SKILL_SUGGESTIONS.some(
                        (s) => s.toLowerCase() === skillInput.trim().toLowerCase()
                      ) &&
                      !draft.skills.some(
                        (s) => s.toLowerCase() === skillInput.trim().toLowerCase()
                      ) && (
                        <li>
                          <button
                            type="button"
                            className="flex w-full rounded-lg px-3 py-2 text-left text-[#FAFAFA] hover:bg-[#171717]"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSkillAdd(skillInput)}
                          >
                            Ajouter &laquo;&nbsp;{skillInput.trim()}&nbsp;&raquo;
                          </button>
                        </li>
                      )}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* Footer sticky */}
          <div className="flex items-center justify-end gap-3 border-t border-[#383838] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSaving}
              className="text-[#A1A1A1] hover:text-[#FAFAFA]"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-[#00D492] text-[#0A0A0A] hover:bg-[#00D492]/90"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm close dialog */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="max-w-sm border border-[#383838] bg-[#171717] p-6">
          <DialogTitle className="text-base font-semibold text-[#FAFAFA]">
            Quitter sans enregistrer ?
          </DialogTitle>
          <p className="mt-2 text-sm text-[#A1A1A1]">
            Tu as des modifications non sauvegardées. Tu veux continuer l&apos;édition ?
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmClose(false)}
              className="text-[#A1A1A1] hover:text-[#FAFAFA]"
            >
              Continuer l&apos;édition
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmClose(false)
                onOpenChange(false)
              }}
            >
              Quitter sans enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
