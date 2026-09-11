"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  SearchableSelect,
} from "@/components/jobs/searchable-multi-select"
import {
  LANGUAGE_LEVELS,
  type ProfileLanguageEntry,
} from "@/lib/profile/types"
import { PROFILE_LANGUAGE_SUGGESTIONS } from "@/lib/profile/suggestion-catalogs"
import { emptyLanguageEntry } from "@/lib/profile/helpers"
import { cn } from "@/lib/utils"

type LanguageEntriesFieldProps = {
  entries: ProfileLanguageEntry[]
  onChange: (entries: ProfileLanguageEntry[]) => void
  className?: string
}

export function LanguageEntriesField({
  entries,
  onChange,
  className,
}: LanguageEntriesFieldProps) {
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null)
  const options = useMemo(
    () =>
      PROFILE_LANGUAGE_SUGGESTIONS.filter(
        (lang) =>
          !entries.some(
            (entry) => entry.language.toLowerCase() === lang.toLowerCase()
          )
      ),
    [entries]
  )

  const handleSelectLanguage = (language: string | null) => {
    if (!language) return
    if (
      entries.some(
        (entry) => entry.language.toLowerCase() === language.toLowerCase()
      )
    ) {
      return
    }
    setPendingLanguage(language)
  }

  const handleSelectLevel = (level: (typeof LANGUAGE_LEVELS)[number]) => {
    if (!pendingLanguage) return
    const next = emptyLanguageEntry()
    next.language = pendingLanguage
    next.level = level
    onChange([...entries, next])
    setPendingLanguage(null)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <SearchableSelect
        id="language-search"
        options={options}
        value={null}
        onChange={handleSelectLanguage}
        placeholder="Rechercher une langue…"
        allowCustom
        emptyOptionLabel="Choisir une langue"
      />

      {pendingLanguage ? (
        <div
          className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3"
          role="group"
          aria-label={`Niveau pour ${pendingLanguage}`}
        >
          <p className="text-base font-medium">
            Niveau pour {pendingLanguage}
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className="rounded-[8px] border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                onClick={() => handleSelectLevel(level)}
              >
                {level}
              </button>
            ))}
            <button
              type="button"
              className="rounded-[8px] border border-transparent px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setPendingLanguage(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {entries.length === 0 ? (
          <p className="text-base text-muted-foreground">
            Aucune langue pour l’instant.
          </p>
        ) : (
          entries.map((entry) => (
            <Badge key={entry.id} variant="chip" className="gap-1.5">
              <button
                type="button"
                className="text-left"
                onClick={() => setPendingLanguage(entry.language)}
                aria-label={`Modifier le niveau de ${entry.language}`}
              >
                {entry.language}
                {entry.level ? ` · ${entry.level}` : ""}
              </button>
              <button
                type="button"
                aria-label={`Retirer ${entry.language}`}
                onClick={() =>
                  onChange(entries.filter((item) => item.id !== entry.id))
                }
                className="opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {pendingLanguage &&
      entries.some(
        (e) => e.language.toLowerCase() === pendingLanguage.toLowerCase()
      ) ? (
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className="rounded-[8px] border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
              onClick={() => {
                onChange(
                  entries.map((entry) =>
                    entry.language.toLowerCase() ===
                    pendingLanguage.toLowerCase()
                      ? { ...entry, level }
                      : entry
                  )
                )
                setPendingLanguage(null)
              }}
            >
              {level}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
