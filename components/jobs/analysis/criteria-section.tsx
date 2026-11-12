"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, CircleHelp, LayoutGrid } from "lucide-react"
import {
  CRITERION_CONCLUSIONS,
  countCriteriaByFilter,
  criterionMatchesFilter,
  type AnalysisCriterion,
  type CriterionFilter,
} from "@/lib/jobs/job-analysis-model"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AnalysisNotice,
  AnalysisTextButton,
  CriterionStatusBadge,
} from "@/components/jobs/analysis/analysis-status"

const FILTERS: Array<{ value: CriterionFilter; label: string }> = [
  { value: "all", label: "Tous les critères" },
  { value: "demonstrated", label: "Démontrés" },
  { value: "to_clarify", label: "À préciser" },
]

type CriteriaSectionProps = {
  criteria: AnalysisCriterion[]
  onClarify: (criterionId: string) => void
  canClarify: (criterionId: string) => boolean
  focusRequest: { id: string; nonce: number } | null
}

export function CriteriaSection({
  criteria,
  onClarify,
  canClarify,
  focusRequest,
}: CriteriaSectionProps) {
  const [filter, setFilter] = useState<CriterionFilter>("all")
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const counts = useMemo(() => countCriteriaByFilter(criteria), [criteria])
  const visible = useMemo(
    () => criteria.filter((criterion) => criterionMatchesFilter(criterion, filter)),
    [criteria, filter]
  )

  useEffect(() => {
    if (!focusRequest) return
    window.requestAnimationFrame(() => {
      setFilter("all")
      setOpenIds((previous) => new Set(previous).add(focusRequest.id))
      window.requestAnimationFrame(() => {
        const trigger = document.getElementById(
          `criterion-trigger-${focusRequest.id}`
        )
        trigger?.scrollIntoView({ behavior: "smooth", block: "center" })
        trigger?.focus({ preventScroll: true })
      })
    })
  }, [focusRequest])

  const toggle = (id: string) => {
    setOpenIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section
      id="analyse-criteres"
      aria-labelledby="analyse-criteres-title"
      className="min-w-0 space-y-4"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2
            id="analyse-criteres-title"
            className="text-lg font-semibold leading-7 text-app-text-strong"
          >
            Les attentes de l’offre face à ton CV
          </h2>
        </div>

        {criteria.length > 0 ? (
          <div
            className="flex w-fit max-w-full flex-wrap items-center gap-1 overflow-x-auto rounded-app-control border-(length:--app-stroke) border-app-border-strong bg-app-surface p-2"
            role="group"
            aria-label="Filtrer les critères"
          >
            {FILTERS.map((item) => {
              const selected = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "inline-flex h-(--app-control-height) shrink-0 items-center gap-1 rounded-app-control px-4 text-base font-normal leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-text-secondary",
                    selected
                      ? "bg-app-action text-app-text-inverse"
                      : "text-app-text-muted hover:bg-app-control hover:text-app-text"
                  )}
                >
                  {item.label} ({counts[item.value]})
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div>
        {criteria.length === 0 ? (
          <AnalysisNotice>
            Aucun critère exploitable n’a été identifié dans cette offre. Relance
            l’analyse pour vérifier les exigences détectées.
          </AnalysisNotice>
        ) : visible.length === 0 ? (
          <AnalysisNotice className="flex-col items-start">
            <p>Aucun critère ne correspond à ce filtre.</p>
            <AnalysisTextButton className="mt-2" onClick={() => setFilter("all")}>
              Voir tous les critères
            </AnalysisTextButton>
          </AnalysisNotice>
        ) : (
          <ul className="space-y-4">
            {visible.map((criterion) => {
              const open = openIds.has(criterion.id)
              const panelId = `criterion-panel-${criterion.id}`
              const buttonId = `criterion-trigger-${criterion.id}`
              return (
                <li
                  key={criterion.id}
                  className="overflow-hidden rounded-app-control border border-app-border bg-app-surface"
                >
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(criterion.id)}
                    className="flex min-h-16 w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-text-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="min-w-0 break-words text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-strong">
                          {criterion.label}
                        </span>
                        <CriterionStatusBadge status={criterion.status} />
                        {criterion.recruiterBlockRisk === "high" ? (
                          <span className="rounded-full border border-app-border-strong px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-app-text-subtle">
                            Attente forte
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-app-text-secondary">
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>

                  {open ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="space-y-4 px-4 pb-4 pt-2"
                    >
                      <div className="grid min-w-0 gap-4 md:grid-cols-2">
                        <div className="flex min-h-[95px] flex-col gap-2">
                          <p className="text-base font-medium leading-6 text-app-text">
                            Ce que l’offre demande
                          </p>
                          <div className="min-h-[60px] flex-1 whitespace-pre-wrap break-words rounded-app-date border-(length:--app-stroke) border-app-border bg-app-control p-3 text-base leading-6 text-app-text-subtle">
                            {criterion.evidenceFromJob ??
                              "Extrait de l’offre non disponible dans l’analyse."}
                          </div>
                        </div>

                        <div className="flex min-h-[95px] flex-col gap-2">
                          <p className="text-base font-medium leading-6 text-app-text">
                            Ce que ton CV documente
                          </p>
                          <div className="min-h-[60px] flex-1 whitespace-pre-wrap break-words rounded-app-date border-(length:--app-stroke) border-app-border bg-app-control p-3 text-base leading-6 text-app-text-subtle">
                            {criterion.evidenceFromCv ??
                              "Non documenté dans le CV."}
                          </div>
                        </div>
                      </div>

                      {criterion.confirmation ? (
                        <div className="rounded-app-control border border-app-warning/40 bg-app-warning-surface p-3">
                          <p className="text-base font-medium leading-6 text-app-text">
                            Ta confirmation (distincte du CV)
                          </p>
                          <p className="mt-1 text-base leading-6 text-app-text-subtle">
                            {criterion.confirmation.answer === "no"
                              ? "Tu as indiqué : « Je n’ai pas cette expérience »."
                              : criterion.confirmation.answer === "unknown"
                                ? "Tu as indiqué ne pas savoir encore si tu as cette expérience."
                                : "Tu as confirmé avoir cette expérience ; elle n’est pas pour autant documentée dans ton CV."}
                          </p>
                          {criterion.confirmation.detail ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-text-secondary">
                              Ton exemple déclaré : {criterion.confirmation.detail}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <AnalysisNotice
                        tone="info"
                        icon={CircleHelp}
                        className="w-fit max-w-full items-center rounded-app-control border-app-border bg-app-control px-4 py-4 text-base leading-6"
                      >
                        {CRITERION_CONCLUSIONS[criterion.status]}
                      </AnalysisNotice>

                      <p className="text-sm text-app-text-secondary">Poids dans le score : {criterion.weightPercent} %</p>
                      {criterion.question && canClarify(criterion.id) ? (
                        <div className="flex flex-col gap-4">
                          <p className="text-base leading-6 text-app-text-subtle">
                            {criterion.question}
                          </p>
                          <Button
                            type="button"
                            size="control"
                            onClick={() => onClarify(criterion.id)}
                            className="self-start text-sm sm:self-end"
                          >
                            <LayoutGrid className="h-4 w-4" aria-hidden />
                            Préciser mon expérience
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
