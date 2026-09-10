"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchableMultiSelect, SearchableSelect } from "@/components/jobs/searchable-multi-select"
import {
  EMPLOYMENT_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  MAX_HIGHLIGHTS,
  MONTH_OPTIONS,
  clampHighlights,
  emptyCvExperience,
  type CvEmploymentType,
  type CvLocationType,
} from "@/lib/cv/experiences"
import { FRANCE_CITIES } from "@/lib/onboarding/france-cities"
import type { ProfileExperienceEntry } from "@/lib/profile/types"
import { PROFILE_SKILL_SUGGESTIONS } from "@/lib/profile/suggestion-catalogs"

type ExperienceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ProfileExperienceEntry | null
  onSave: (entry: ProfileExperienceEntry) => void
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
    ...emptyCvExperience(),
  }
}

export function ExperienceDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: ExperienceDialogProps) {
  const [draft, setDraft] = useState<ProfileExperienceEntry>(() => toDraft(initial))
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(initial))
  }, [open, initial])

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

  const updateDraft = <K extends keyof ProfileExperienceEntry>(
    key: K,
    value: ProfileExperienceEntry[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!canSave) {
      toast.error("Intitulé, organisation et année de début sont requis")
      return
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      organization: draft.organization.trim(),
      location: draft.location.trim(),
      highlights: draft.highlights.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l’expérience" : "Ajouter une expérience"}
          </DialogTitle>
          <DialogDescription>
            Entreprise, poste, dates et description — comme sur Collective.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-title">Intitulé du poste *</Label>
            <Input
              id="exp-dialog-title"
              value={draft.title}
              onChange={(e) => updateDraft("title", e.target.value)}
              placeholder="Product Manager"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-org">Entreprise *</Label>
            <Input
              id="exp-dialog-org"
              value={draft.organization}
              onChange={(e) => updateDraft("organization", e.target.value)}
              placeholder="Welcome to the Jungle"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-location">Lieu</Label>
            <SearchableSelect
              id="exp-dialog-location"
              options={
                draft.location &&
                !(FRANCE_CITIES as readonly string[]).includes(draft.location)
                  ? [draft.location, ...FRANCE_CITIES]
                  : [...FRANCE_CITIES]
              }
              value={draft.location || null}
              onChange={(city) => updateDraft("location", city ?? "")}
              placeholder="Paris, France…"
              emptyOptionLabel="Aucun lieu"
              allowCustom
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-freelance" className="mb-0 cursor-pointer">
              Freelance
            </Label>
            <Switch
              id="exp-dialog-freelance"
              checked={draft.employmentType === "Freelance"}
              onCheckedChange={(checked) =>
                updateDraft(
                  "employmentType",
                  (checked ? "Freelance" : "") as CvEmploymentType
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-remote" className="mb-0 cursor-pointer">
              Télétravail
            </Label>
            <Switch
              id="exp-dialog-remote"
              checked={draft.locationType === "remote"}
              onCheckedChange={(checked) =>
                updateDraft(
                  "locationType",
                  (checked ? "remote" : "") as CvLocationType
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-current" className="mb-0 cursor-pointer">
              Poste actuel
            </Label>
            <Switch
              id="exp-dialog-current"
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

          <div className="space-y-2">
            <Label>Type d’emploi</Label>
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

          <div className="space-y-2">
            <Label>Type de lieu</Label>
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

          <div className="space-y-2">
            <Label>Mois de début</Label>
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
          </div>

          <div className="space-y-2">
            <Label>Année de début *</Label>
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
          </div>

          {!draft.isCurrent ? (
            <>
              <div className="space-y-2">
                <Label>Mois de fin</Label>
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
              </div>

              <div className="space-y-2">
                <Label>Année de fin</Label>
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
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id="exp-dialog-current-check" checked disabled />
              <Label htmlFor="exp-dialog-current-check" className="mb-0 text-muted-foreground">
                En cours jusqu’à présent
              </Label>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-highlights">Description</Label>
            <Textarea
              id="exp-dialog-highlights"
              value={draft.highlights}
              onChange={(e) =>
                updateDraft("highlights", clampHighlights(e.target.value))
              }
              rows={5}
              placeholder="Missions, impact, contexte…"
            />
            <p className="text-base text-muted-foreground">
              {draft.highlights.length}/{MAX_HIGHLIGHTS}
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="exp-dialog-skill">Compétences du poste</Label>
            <SearchableMultiSelect
              id="exp-dialog-skill"
              options={skillOptions}
              values={draft.skills}
              onChange={(skills) => updateDraft("skills", skills)}
              placeholder="Ajouter une compétence"
              addButtonLabel="Ajouter"
              allowCustom
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
