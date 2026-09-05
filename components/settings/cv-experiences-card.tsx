"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  EMPLOYMENT_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  MAX_HIGHLIGHTS,
  MONTH_OPTIONS,
  clampHighlights,
  emptyCvExperience,
  type CvEmploymentType,
  type CvExperience,
  type CvLocationType,
} from "@/lib/cv/experiences"

type CvExperiencesCardProps = {
  experiences: CvExperience[]
  onChange: (experiences: CvExperience[]) => void
}

const yearOptions = (() => {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let year = current + 1; year >= current - 40; year -= 1) {
    years.push(String(year))
  }
  return years
})()

export function CvExperiencesCard({ experiences, onChange }: CvExperiencesCardProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [draft, setDraft] = useState(emptyCvExperience())
  const [skillInput, setSkillInput] = useState("")

  const canAdd = useMemo(() => {
    return (
      draft.title.trim().length > 0 &&
      draft.organization.trim().length > 0 &&
      draft.startYear.trim().length > 0
    )
  }, [draft])

  function updateDraft<K extends keyof ReturnType<typeof emptyCvExperience>>(
    key: K,
    value: ReturnType<typeof emptyCvExperience>[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleOpenForm() {
    setDraft(emptyCvExperience())
    setSkillInput("")
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setDraft(emptyCvExperience())
    setSkillInput("")
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

  function handleAddExperience() {
    if (!canAdd) {
      toast.error("Intitulé, organisation et année de début sont requis")
      return
    }

    const next: CvExperience = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `exp-${Date.now()}`,
      ...draft,
      title: draft.title.trim(),
      organization: draft.organization.trim(),
      location: draft.location.trim(),
      highlights: draft.highlights.trim(),
    }

    onChange([...experiences, next])
    handleCloseForm()
    toast.success("Expérience ajoutée")
  }

  function handleRemoveExperience(id: string) {
    onChange(experiences.filter((experience) => experience.id !== id))
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0 p-6 md:p-8">
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold">Expériences</CardTitle>
          <CardDescription className="text-base leading-7">
            Ajoute tes postes manuellement. Ils seront fusionnés dans le texte CV à
            l’enregistrement.
          </CardDescription>
        </div>
        {!formOpen ? (
          <Button type="button" size="lg" onClick={handleOpenForm}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6 md:px-8 md:pb-8">
        {experiences.length > 0 ? (
          <ul className="space-y-4">
            {experiences.map((experience) => (
              <li
                key={experience.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4 md:p-6"
              >
                <div className="min-w-0 space-y-2">
                  <p className="text-lg font-semibold uppercase tracking-wide text-foreground">
                    {experience.title}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {experience.organization}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {[
                      experience.startMonth
                        ? MONTH_OPTIONS.find((m) => m.value === experience.startMonth)?.label
                        : null,
                      experience.startYear,
                      "→",
                      experience.isCurrent
                        ? "présent"
                        : [
                            MONTH_OPTIONS.find((m) => m.value === experience.endMonth)?.label,
                            experience.endYear,
                          ]
                            .filter(Boolean)
                            .join(" "),
                      experience.employmentType,
                      experience.location,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {experience.highlights.trim() ? (
                    <p className="whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                      {experience.highlights.trim()}
                    </p>
                  ) : null}
                  {experience.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {experience.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveExperience(experience.id)}
                  aria-label={`Supprimer ${experience.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-base leading-7 text-muted-foreground">
            Aucune expérience ajoutée pour l’instant.
          </p>
        )}

        {formOpen ? (
        <div className="space-y-6 rounded-2xl border border-border p-4 md:p-6">
          <h3 className="text-lg font-semibold">Ajouter un poste</h3>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label htmlFor="exp-title" className="mb-0 text-base">
                Intitulé du poste *
              </Label>
              <Input
                id="exp-title"
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                placeholder="Exemple : Product Manager"
                className="h-12 text-base"
              />
            </Field>

            <Field className="sm:col-span-2">
              <Label htmlFor="exp-org" className="mb-0 text-base">
                Organisation *
              </Label>
              <Input
                id="exp-org"
                value={draft.organization}
                onChange={(e) => updateDraft("organization", e.target.value)}
                placeholder="Exemple : Welcome to the Jungle"
                className="h-12 text-base"
              />
            </Field>

            <Field>
              <Label htmlFor="exp-location" className="mb-0 text-base">
                Lieu
              </Label>
              <Input
                id="exp-location"
                value={draft.location}
                onChange={(e) => updateDraft("location", e.target.value)}
                placeholder="Ville ou région"
                className="h-12 text-base"
              />
            </Field>

            <Field>
              <Label className="mb-0 text-base">Type de lieu</Label>
              <Select
                value={draft.locationType || "__none__"}
                onValueChange={(value) =>
                  updateDraft(
                    "locationType",
                    (!value || value === "__none__" ? "" : value) as CvLocationType
                  )
                }
              >
                <SelectTrigger className="h-12 w-full text-base">
                  <SelectValue placeholder="Veuillez sélectionner" />
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
            </Field>

            <Field>
              <Label className="mb-0 text-base">Type d’emploi</Label>
              <Select
                value={draft.employmentType || "__none__"}
                onValueChange={(value) =>
                  updateDraft(
                    "employmentType",
                    (!value || value === "__none__" ? "" : value) as CvEmploymentType
                  )
                }
              >
                <SelectTrigger className="h-12 w-full text-base">
                  <SelectValue placeholder="Veuillez sélectionner" />
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
            </Field>

            <div className="flex items-center gap-3 sm:items-end sm:pb-2">
              <Checkbox
                id="exp-current"
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
              <Label htmlFor="exp-current" className="mb-0 cursor-pointer text-base">
                Ceci est mon poste actuel
              </Label>
            </div>

            <Field>
              <Label className="mb-0 text-base">Mois de début</Label>
              <Select
                value={draft.startMonth}
                onValueChange={(value) => updateDraft("startMonth", value ?? "")}
              >
                <SelectTrigger className="h-12 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label className="mb-0 text-base">Année de début *</Label>
              <Select
                value={draft.startYear}
                onValueChange={(value) => updateDraft("startYear", value ?? "")}
              >
                <SelectTrigger className="h-12 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {!draft.isCurrent ? (
              <>
                <Field>
                  <Label className="mb-0 text-base">Mois de fin</Label>
                  <Select
                    value={draft.endMonth || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endMonth", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-12 w-full text-base">
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
                </Field>

                <Field>
                  <Label className="mb-0 text-base">Année de fin</Label>
                  <Select
                    value={draft.endYear || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endYear", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger className="h-12 w-full text-base">
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
                </Field>
              </>
            ) : null}

            <Field className="sm:col-span-2">
              <Label htmlFor="exp-highlights" className="mb-0 text-base">
                Points clés
              </Label>
              <Textarea
                id="exp-highlights"
                value={draft.highlights}
                onChange={(e) => updateDraft("highlights", clampHighlights(e.target.value))}
                rows={5}
                placeholder="Réalisations, impact, contexte…"
                className="text-base leading-7"
              />
              <p className="text-sm text-muted-foreground">
                {draft.highlights.length}/{MAX_HIGHLIGHTS}
              </p>
            </Field>

            <Field className="sm:col-span-2">
              <Label htmlFor="exp-skill" className="mb-0 text-base">
                Compétences
              </Label>
              <p className="text-sm leading-6 text-muted-foreground">
                Ajoute des compétences pour afficher tes points forts.
              </p>
              <div className="flex gap-2">
                <Input
                  id="exp-skill"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Ajouter une compétence"
                  className="h-12 text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddSkill()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="lg" onClick={handleAddSkill}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              {draft.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {draft.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium touch-manipulation"
                      aria-label={`Retirer ${skill}`}
                    >
                      {skill}
                      <X className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  ))}
                </div>
              ) : null}
            </Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button type="button" size="lg" onClick={handleAddExperience} disabled={!canAdd}>
              Enregistrer l’expérience
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={handleCloseForm}>
              Annuler
            </Button>
          </div>
        </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
