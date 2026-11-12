"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, PenLine, Sparkles, WandSparkles } from "lucide-react"
import type {
  AnalysisQuestion,
  AnalysisSuggestion,
} from "@/lib/jobs/job-analysis-model"
import {
  AnalysisEyebrow,
  AnalysisNotice,
  analysisSurfaceClassName,
} from "@/components/jobs/analysis/analysis-status"

type SuggestionsSectionProps = {
  suggestions: AnalysisSuggestion[]
  loading: boolean
  appliedIds: Set<string>
  dismissedIds: Set<string>
  applyingId: string | null
  getExperienceQuestion: (
    suggestion: AnalysisSuggestion
  ) => AnalysisQuestion | null
  onApply: (suggestionId: string, text?: string) => Promise<boolean>
  onIgnore: (suggestionId: string) => Promise<void>
  onViewCv: () => void
  onCompleteExperience: (question: AnalysisQuestion) => void
  onDirtyChange: (dirty: boolean) => void
}

export function SuggestionsSection({
  suggestions,
  loading,
  appliedIds,
  dismissedIds,
  applyingId,
  getExperienceQuestion,
  onApply,
  onIgnore,
  onViewCv,
  onCompleteExperience,
  onDirtyChange,
}: SuggestionsSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [ignoringId, setIgnoringId] = useState<string | null>(null)

  // Unsaved formulations or an open editor must block silent navigation.
  const dirty = editingId !== null || Object.keys(drafts).length > 0
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => () => onDirtyChange(false), [onDirtyChange])

  const visible = suggestions.filter((item) => !dismissedIds.has(item.id))

  const startEditing = (suggestion: AnalysisSuggestion) => {
    setEditingId(suggestion.id)
    setEditValue(
      drafts[suggestion.id] ?? suggestion.proposedText ?? ""
    )
  }

  return (
    <section
      id="suggestions"
      aria-labelledby="suggestions-title"
      className={analysisSurfaceClassName}
    >
      <div className="max-w-3xl">
        <AnalysisEyebrow>Suggestions CV</AnalysisEyebrow>
        <h2
          id="suggestions-title"
          className="mt-2 text-lg font-semibold tracking-tight text-app-text"
        >
          Adapte ton CV à cette offre
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-app-text-secondary">
          Ces reformulations s’appuient sur ton expérience documentée. Vérifie
          chaque proposition avant de l’appliquer : aucune ne garantit un gain de
          score.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {loading && visible.length === 0 ? (
          <div className="space-y-3" aria-live="polite">
            <div className="h-28 animate-pulse rounded-app-surface border border-app-border bg-app-surface-raised" />
            <p className="text-sm text-app-text-secondary">
              Préparation des suggestions à partir de ton CV…
            </p>
          </div>
        ) : visible.length === 0 ? (
          <AnalysisNotice>
            <p className="font-medium text-app-text">
              Aucune reformulation nécessaire pour le moment.
            </p>
            <p className="mt-1 text-app-text-secondary">
              L’analyse n’a pas identifié de reformulation sûre à proposer pour
              cette offre. Aucune suggestion n’est générée pour remplir la page.
            </p>
          </AnalysisNotice>
        ) : (
          visible.map((suggestion) => {
            const applied = appliedIds.has(suggestion.id)
            const applying = applyingId === suggestion.id
            const ignoring = ignoringId === suggestion.id
            const proposed = drafts[suggestion.id] ?? suggestion.proposedText
            const editing = editingId === suggestion.id
            const experienceQuestion = suggestion.confirmationRequired
              ? getExperienceQuestion(suggestion)
              : null

            if (suggestion.confirmationRequired) {
              return (
                <article
                  key={suggestion.id}
                  className="rounded-app-control border border-app-border bg-app-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-app-text">
                        Suggestion en attente de précisions
                      </h3>
                      <p className="mt-1 text-sm text-app-text-subtle">
                        {suggestion.title}
                      </p>
                    </div>
                    <span className="inline-flex min-h-8 items-center gap-1 rounded-app-control bg-app-warning-surface px-2 text-base font-medium leading-6 text-app-warning">
                      <WandSparkles className="h-4 w-4" aria-hidden />
                      À préciser
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-app-text-secondary">
                    Précise ton expérience pour préparer une formulation fidèle à
                    ton parcours.
                  </p>
                  {suggestion.question ? (
                    <p className="mt-1 text-sm leading-relaxed text-app-text-subtle">
                      {suggestion.question}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {experienceQuestion ? (
                      <button
                        type="button"
                        onClick={() => onCompleteExperience(experienceQuestion)}
                        className="inline-flex min-h-9 items-center justify-center rounded-app-control border border-app-text-secondary bg-app-control px-3 text-sm font-medium text-app-text transition-colors hover:border-app-text hover:bg-app-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                      >
                        Compléter mon expérience
                      </button>
                    ) : null}
                    {suggestion.applicable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIgnoringId(suggestion.id)
                          void onIgnore(suggestion.id).finally(() =>
                            setIgnoringId(null)
                          )
                        }}
                        disabled={ignoring}
                        className="inline-flex min-h-9 items-center justify-center rounded-app-control px-3 text-sm font-medium text-app-text-secondary transition-colors hover:text-app-text disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                      >
                        Ignorer
                      </button>
                    ) : (
                      <span className="self-center text-xs text-app-text-muted">
                        Cette proposition ne peut pas être appliquée sans
                        précision vérifiable.
                      </span>
                    )}
                  </div>
                </article>
              )
            }

            if (!suggestion.applicable) {
              return (
                <article
                  key={suggestion.id}
                  className="rounded-app-control border border-app-border bg-app-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-medium leading-snug text-app-text">
                        {suggestion.title}
                      </h3>
                      <p className="mt-1 text-sm text-app-text-secondary">
                        Section CV : {suggestion.section}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app-border-strong bg-app-control px-2.5 py-1 text-xs font-medium text-app-text-subtle">
                      <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                      Piste d’analyse
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-app-badge border border-app-border bg-app-surface p-3.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-app-text-secondary">
                        Texte actuel
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text-subtle">
                        {suggestion.currentText ??
                          "Aucun texte existant identifié — il s’agit d’un ajout proposé."}
                      </p>
                    </div>
                    <div className="rounded-app-badge border border-app-border bg-app-surface p-3.5">
                      <p className="text-xs font-medium uppercase tracking-wide text-app-text-secondary">
                        Proposition
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text">
                        {suggestion.proposedText ??
                          "Aucune proposition exploitable pour cette suggestion."}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-app-text-secondary">
                    {suggestion.reason ||
                      "Reformulation proposée pour mieux correspondre à l’offre."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onViewCv}
                      className="inline-flex min-h-9 items-center justify-center rounded-app-control border border-app-text-secondary bg-app-control px-3 text-sm font-medium text-app-text transition-colors hover:border-app-text hover:bg-app-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                    >
                      Ouvrir mon CV adapté
                    </button>
                    <span className="text-xs text-app-text-muted">
                      Cette piste vient de l’analyse : elle ne peut pas être
                      appliquée directement ici.
                    </span>
                  </div>
                </article>
              )
            }

            return (
              <article
                key={suggestion.id}
                className="overflow-hidden rounded-app-control border border-app-border bg-app-surface"
              >
                <div className="flex flex-col gap-2 border-b border-app-border px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-medium leading-snug text-app-text">
                      {suggestion.title}
                    </h3>
                    <p className="mt-1 text-sm text-app-text-secondary">
                      Section CV : {suggestion.section}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app-border-strong bg-app-control px-2.5 py-1 text-xs font-medium text-app-text-subtle">
                    <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                    Reformulation
                  </span>
                </div>

                <div className="grid gap-0 md:grid-cols-2">
                  <div className="border-b border-app-border p-4 md:border-b-0 md:border-r">
                    <p className="text-base font-medium leading-6 text-app-text">
                      Texte actuel
                    </p>
                    <div className="mt-2 min-h-[60px] whitespace-pre-wrap rounded-app-control border-(length:--app-stroke) border-app-border bg-app-control p-3 text-base leading-6 text-app-text-subtle">
                      {suggestion.currentText ??
                        "Aucun texte existant identifié — il s’agit d’un ajout proposé."}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-base font-medium leading-6 text-app-text">
                      Proposition
                    </p>
                    {editing ? (
                      <div className="mt-2 space-y-2">
                        <label
                          htmlFor={`proposal-edit-${suggestion.id}`}
                          className="block text-sm font-medium text-app-text"
                        >
                          Ta formulation
                        </label>
                        <textarea
                          id={`proposal-edit-${suggestion.id}`}
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          rows={4}
                          className="min-h-24 w-full rounded-app-control border-(length:--app-stroke) border-app-border bg-app-control px-3 py-2.5 text-base leading-6 text-app-text focus-visible:border-app-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary/40"
                        />
                        <p className="text-xs leading-relaxed text-app-text-secondary">
                          Vérifie que cette phrase décrit fidèlement ton
                          expérience.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDrafts((previous) => ({
                                ...previous,
                                [suggestion.id]: editValue,
                              }))
                              setEditingId(null)
                            }}
                            className="inline-flex min-h-9 items-center justify-center rounded-app-control bg-app-action px-3 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                          >
                            Enregistrer la formulation
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex min-h-9 items-center justify-center rounded-app-control border border-app-border-strong bg-app-control px-3 text-sm font-medium text-app-text-subtle transition-colors hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 min-h-[60px] whitespace-pre-wrap rounded-app-control border-(length:--app-stroke) border-app-success/60 bg-app-success-surface p-3 text-base leading-6 text-app-success">
                        {proposed ??
                          "Aucune proposition exploitable pour cette suggestion."}
                      </div>
                    )}

                    <div className="mt-4 rounded-app-control border border-app-border bg-app-control p-3">
                      <p className="text-base leading-6 text-app-text-subtle">
                        {suggestion.reason ||
                          "Reformulation proposée pour mieux correspondre à l’offre."}
                      </p>
                      {suggestion.keywords.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {suggestion.keywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full border border-app-border bg-app-control px-2 py-0.5 text-xs text-app-text-subtle"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-app-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
                  {applied ? (
                    <div className="flex w-full flex-wrap items-center gap-2 text-sm text-app-success">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      <span className="text-app-text-subtle">
                        Suggestion appliquée à ton CV adapté.
                      </span>
                      <button
                        type="button"
                        onClick={onViewCv}
                        className="rounded-[6px] font-medium underline underline-offset-4 hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary"
                      >
                        Voir dans mon CV
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={applying || !proposed?.trim() || editing}
                        onClick={() => {
                          void onApply(suggestion.id, drafts[suggestion.id]).then(
                            (appliedSuccessfully) => {
                              if (!appliedSuccessfully) return
                              setDrafts((previous) => {
                                const next = { ...previous }
                                delete next[suggestion.id]
                                return next
                              })
                              setEditingId(null)
                            }
                          )
                        }}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-app-control bg-app-action px-3 text-sm font-semibold text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                      >
                        {applying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {applying
                          ? "Application…"
                          : "Appliquer à mon CV adapté"}
                      </button>
                      <button
                        type="button"
                        disabled={editing}
                        onClick={() => startEditing(suggestion)}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-app-control border border-app-border-strong bg-app-control px-3 text-sm font-medium text-app-text-subtle transition-colors hover:border-app-text-secondary hover:text-app-text disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                      >
                        <PenLine className="h-3.5 w-3.5" aria-hidden />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={ignoring}
                        onClick={() => {
                          setIgnoringId(suggestion.id)
                          void onIgnore(suggestion.id).finally(() =>
                            setIgnoringId(null)
                          )
                        }}
                        className="inline-flex min-h-9 items-center justify-center rounded-app-control px-3 text-sm font-medium text-app-text-secondary transition-colors hover:text-app-text disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
                      >
                        Ignorer
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
