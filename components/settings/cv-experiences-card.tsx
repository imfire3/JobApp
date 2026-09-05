"use client"

import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
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
    <Card>
      <CardHeader>
        <CardTitle>Expériences</CardTitle>
        <CardDescription>
          Ajoute tes postes manuellement. Ils seront fusionnés dans le texte CV à
          l’enregistrement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {experiences.length > 0 ? (
          <ul className="space-y-3">
            {experiences.map((experience) => (
              <li
                key={experience.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">
                    {experience.title}
                    <span className="text-muted-foreground"> — {experience.organization}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                  {experience.skills.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {experience.skills.join(", ")}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveExperience(experience.id)}
                  aria-label={`Supprimer ${experience.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Aucune expérience ajoutée pour l’instant.
          </p>
        )}

        {!formOpen ? (
          <Button type="button" onClick={handleOpenForm}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une expérience
          </Button>
        ) : (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium">Ajouter un poste</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label htmlFor="exp-title" className="mb-0">
                Intitulé du poste *
              </Label>
              <Input
                id="exp-title"
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                placeholder="Exemple : Chef de produit senior"
              />
            </Field>

            <Field className="sm:col-span-2">
              <Label htmlFor="exp-org" className="mb-0">
                Organisation *
              </Label>
              <Input
                id="exp-org"
                value={draft.organization}
                onChange={(e) => updateDraft("organization", e.target.value)}
                placeholder="Exemple : Microsoft"
              />
            </Field>

            <Field>
              <Label htmlFor="exp-location" className="mb-0">
                Lieu
              </Label>
              <Input
                id="exp-location"
                value={draft.location}
                onChange={(e) => updateDraft("location", e.target.value)}
                placeholder="Ville ou région"
              />
            </Field>

            <Field>
              <Label className="mb-0">Type de lieu</Label>
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
              <Label className="mb-0">Type d’emploi</Label>
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

            <div className="flex items-center gap-2 sm:items-end sm:pb-2">
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
              <Label htmlFor="exp-current" className="mb-0 cursor-pointer">
                Ceci est mon poste actuel
              </Label>
            </div>

            <Field>
              <Label className="mb-0">Mois de début</Label>
              <Select
                value={draft.startMonth}
                onValueChange={(value) => updateDraft("startMonth", value ?? "")}
              >
                <SelectTrigger className="w-full">
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
              <Label className="mb-0">Année de début *</Label>
              <Select
                value={draft.startYear}
                onValueChange={(value) => updateDraft("startYear", value ?? "")}
              >
                <SelectTrigger className="w-full">
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
                  <Label className="mb-0">Mois de fin</Label>
                  <Select
                    value={draft.endMonth || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endMonth", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
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
                  <Label className="mb-0">Année de fin</Label>
                  <Select
                    value={draft.endYear || "__none__"}
                    onValueChange={(value) =>
                      updateDraft("endYear", !value || value === "__none__" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full">
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
              <Label htmlFor="exp-highlights" className="mb-0">
                Points clés
              </Label>
              <Textarea
                id="exp-highlights"
                value={draft.highlights}
                onChange={(e) => updateDraft("highlights", clampHighlights(e.target.value))}
                rows={5}
                placeholder="Réalisations, impact, contexte…"
              />
              <p className="text-xs text-muted-foreground">
                {draft.highlights.length}/{MAX_HIGHLIGHTS}
              </p>
            </Field>

            <Field className="sm:col-span-2">
              <Label htmlFor="exp-skill" className="mb-0">
                Compétences
              </Label>
              <p className="text-xs text-muted-foreground">
                Ajoute des compétences pour afficher tes points forts.
              </p>
              <div className="flex gap-2">
                <Input
                  id="exp-skill"
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
                <Button type="button" variant="outline" onClick={handleAddSkill}>
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
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium touch-manipulation"
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

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleAddExperience} disabled={!canAdd}>
              Enregistrer l’expérience
            </Button>
            <Button type="button" variant="outline" onClick={handleCloseForm}>
              Annuler
            </Button>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
