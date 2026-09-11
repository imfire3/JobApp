"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SortableList } from "@/components/profile/sortable-list"
import { MONTH_OPTIONS } from "@/lib/cv/experiences"
import { emptyEducationEntry } from "@/lib/profile/helpers"
import type { ProfileEducationEntry } from "@/lib/profile/types"

type EducationEntriesCardProps = {
  entries: ProfileEducationEntry[]
  onChange: (entries: ProfileEducationEntry[]) => void
}

export function EducationEntriesCard({
  entries,
  onChange,
}: EducationEntriesCardProps) {
  const [draft, setDraft] = useState<ProfileEducationEntry | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear()
    const years: string[] = []
    for (let year = current + 1; year >= current - 60; year -= 1) {
      years.push(String(year))
    }
    return years
  }, [])

  useEffect(() => {
    if (draft && editingId === draft.id) {
      window.requestAnimationFrame(() => nameRef.current?.focus())
    }
  }, [draft, editingId])

  const handleAdd = () => {
    const next = emptyEducationEntry()
    setDraft(next)
    setEditingId(next.id)
    onChange([next, ...entries])
  }

  const handleSaveDraft = () => {
    if (!draft) return
    if (!draft.name.trim()) {
      toast.error("Le nom du diplôme est requis")
      return
    }
    onChange(
      entries.map((entry) => (entry.id === draft.id ? { ...draft, name: draft.name.trim() } : entry))
    )
    setDraft(null)
    setEditingId(null)
    toast.success("Diplôme enregistré")
  }

  const handleRemove = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
    if (draft?.id === id) {
      setDraft(null)
      setEditingId(null)
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>Diplômes & formations</CardTitle>
          <CardDescription>
            Ajoute tes diplômes — glisse pour réorganiser.
          </CardDescription>
        </div>
        <Button type="button" variant="secondary" onClick={handleAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Ajouter un diplôme
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-base text-muted-foreground">
            Aucun diplôme pour l’instant.
          </p>
        ) : (
          <SortableList
            items={entries}
            onReorder={onChange}
            renderItem={(entry) => {
              const isEditing = draft?.id === entry.id
              if (isEditing && draft) {
                return (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`edu-name-${draft.id}`}>Nom *</Label>
                      <Input
                        ref={nameRef}
                        id={`edu-name-${draft.id}`}
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        placeholder="Master Product Management"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>École</Label>
                        <Input
                          value={draft.school}
                          onChange={(e) =>
                            setDraft({ ...draft, school: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Niveau</Label>
                        <Input
                          value={draft.level}
                          onChange={(e) =>
                            setDraft({ ...draft, level: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Début</Label>
                        <div className="flex gap-2">
                          <select
                            className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                            value={draft.startMonth}
                            onChange={(e) =>
                              setDraft({ ...draft, startMonth: e.target.value })
                            }
                          >
                            <option value="">MM</option>
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                            value={draft.startYear}
                            onChange={(e) =>
                              setDraft({ ...draft, startYear: e.target.value })
                            }
                          >
                            <option value="">AAAA</option>
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Fin</Label>
                        <div className="flex gap-2">
                          <select
                            className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                            value={draft.endMonth}
                            disabled={draft.isCurrent}
                            onChange={(e) =>
                              setDraft({ ...draft, endMonth: e.target.value })
                            }
                          >
                            <option value="">MM</option>
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-10 flex-1 rounded-md border border-input bg-transparent px-2 text-base"
                            value={draft.endYear}
                            disabled={draft.isCurrent}
                            onChange={(e) =>
                              setDraft({ ...draft, endYear: e.target.value })
                            }
                          >
                            <option value="">AAAA</option>
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-base">
                      <Checkbox
                        checked={draft.isCurrent}
                        onCheckedChange={(checked) =>
                          setDraft({
                            ...draft,
                            isCurrent: Boolean(checked),
                            endMonth: checked ? "" : draft.endMonth,
                            endYear: checked ? "" : draft.endYear,
                          })
                        }
                      />
                      J&apos;y étudie toujours
                    </label>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={handleSaveDraft}>
                        Enregistrer
                      </Button>
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
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-semibold leading-6">
                      {entry.name || "Nouveau diplôme"}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {[entry.school, entry.level].filter(Boolean).join(" · ") ||
                        "Complète les détails"}
                    </p>
                    <p className="text-base text-muted-foreground">
                      {[
                        entry.startMonth
                          ? MONTH_OPTIONS.find((m) => m.value === entry.startMonth)
                              ?.label
                          : null,
                        entry.startYear,
                        "→",
                        entry.isCurrent
                          ? "présent"
                          : [
                              MONTH_OPTIONS.find((m) => m.value === entry.endMonth)
                                ?.label,
                              entry.endYear,
                            ]
                              .filter(Boolean)
                              .join(" "),
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDraft(entry)
                        setEditingId(entry.id)
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer ${entry.name}`}
                      onClick={() => handleRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
