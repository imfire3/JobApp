"use client"

import { useEffect, useMemo, useState } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MONTH_OPTIONS } from "@/lib/cv/experiences"
import { emptyEducationEntry } from "@/lib/profile/helpers"
import type { ProfileEducationEntry } from "@/lib/profile/types"

type EducationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ProfileEducationEntry | null
  onSave: (entry: ProfileEducationEntry) => void
}

const yearOptions = (() => {
  const current = new Date().getFullYear()
  const years: string[] = []
  for (let year = current + 1; year >= current - 60; year -= 1) {
    years.push(String(year))
  }
  return years
})()

function toDraft(initial?: ProfileEducationEntry | null): ProfileEducationEntry {
  if (initial) return { ...initial, skills: [...initial.skills] }
  return emptyEducationEntry()
}

export function EducationDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: EducationDialogProps) {
  const [draft, setDraft] = useState<ProfileEducationEntry>(() => toDraft(initial))
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    setDraft(toDraft(initial))
  }, [open, initial])

  const canSave = useMemo(() => draft.name.trim().length > 0, [draft.name])

  const handleSave = () => {
    if (!canSave) {
      toast.error("Le nom du diplôme ou de la formation est requis")
      return
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      school: draft.school.trim(),
      level: draft.level.trim(),
      description: draft.description.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la formation" : "Ajouter une formation"}
          </DialogTitle>
          <DialogDescription>
            Diplôme, école, dates et description.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edu-dialog-name">Diplôme / formation *</Label>
            <Input
              id="edu-dialog-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Master Product Management"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edu-dialog-school">École ou organisme</Label>
            <Input
              id="edu-dialog-school"
              value={draft.school}
              onChange={(e) => setDraft({ ...draft, school: e.target.value })}
              placeholder="HEC Paris"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edu-dialog-level">Niveau</Label>
            <Input
              id="edu-dialog-level"
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: e.target.value })}
              placeholder="Bac+5"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 sm:col-span-2">
            <Label htmlFor="edu-dialog-current" className="mb-0 cursor-pointer">
              Formation en cours
            </Label>
            <Switch
              id="edu-dialog-current"
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
            <Label>Mois de début</Label>
            <Select
              value={draft.startMonth || "__none__"}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  startMonth: !value || value === "__none__" ? "" : value,
                })
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
            <Label>Année de début</Label>
            <Select
              value={draft.startYear || "__none__"}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  startYear: !value || value === "__none__" ? "" : value,
                })
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

          {!draft.isCurrent ? (
            <>
              <div className="space-y-2">
                <Label>Mois de fin</Label>
                <Select
                  value={draft.endMonth || "__none__"}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      endMonth: !value || value === "__none__" ? "" : value,
                    })
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
                    setDraft({
                      ...draft,
                      endYear: !value || value === "__none__" ? "" : value,
                    })
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
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edu-dialog-desc">Description</Label>
            <Textarea
              id="edu-dialog-desc"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={4}
              placeholder="Spécialisation, projets, mentions…"
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
