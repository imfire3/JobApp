"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ExternalLink,
  ChevronDown,
  Loader2,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import { PageHelpButton } from "@/components/onboarding/page-help-button"
import { StickyPageHeader } from "@/components/layout/sticky-page-header"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SOURCE_CATALOG, MY_IMPORTED_SOURCE } from "@/lib/sources/constants"
import { cn } from "@/lib/utils"

type ResearchPlanState = {
  roles: string[]
  keywords: string[]
  location: string
  published_within_hours: number
  min_match_score: number | null
  source_slugs: string[]
  summary_fr: string
}

type ResearchCandidate = {
  id: string
  title: string
  company: string
  url: string
  location: string | null
  posted_at: string
  source: string
  description: string | null
  remote: boolean
  contract_type: string | null
  salary: string | null
  origin: "live" | "imported"
  job_id?: string
}

type SourceCapabilityInfo = {
  slug: string
  research_capability?: "live_api" | "imported_only"
  research_label?: string
  research_detail?: string
}

function rolesToInput(roles: string[]): string {
  return roles.join(", ")
}

function parseRolesInput(value: string): string[] {
  return value
    .split(/[,;/]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function ResearchPage() {
  const [prompt, setPrompt] = useState("")
  const [plan, setPlan] = useState<ResearchPlanState | null>(null)
  const [planning, setPlanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [candidates, setCandidates] = useState<ResearchCandidate[]>([])
  const [meta, setMeta] = useState<{
    live_count: number
    imported_count: number
    publiee_depuis_days: number
    source_notes: Array<{
      slug: string
      capability: string
      label: string
      detail: string
      error?: string
    }>
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [capabilities, setCapabilities] = useState<
    Record<string, SourceCapabilityInfo>
  >({})

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sources")
        if (!res.ok) return
        const data = (await res.json()) as { sources?: SourceCapabilityInfo[] }
        const map: Record<string, SourceCapabilityInfo> = {}
        for (const source of data.sources ?? []) {
          if (source.slug) map[source.slug] = source
        }
        // Fill gaps from catalog for sources not yet bootstrapped
        for (const entry of SOURCE_CATALOG) {
          if (!map[entry.slug]) {
            map[entry.slug] = {
              slug: entry.slug,
              research_capability:
                entry.ingestionMode === "api" ? "live_api" : "imported_only",
              research_label:
                entry.ingestionMode === "api"
                  ? "API"
                  : "Bibliothèque importée",
            }
          }
        }
        if (!map[MY_IMPORTED_SOURCE.slug]) {
          map[MY_IMPORTED_SOURCE.slug] = {
            slug: MY_IMPORTED_SOURCE.slug,
            research_capability: "imported_only",
            research_label: "Bibliothèque",
            research_detail:
              "Filtre tout ton board, toutes sources confondues",
          }
        }
        setCapabilities(map)
      } catch {
        // ignore
      }
    })()
  }, [])

  const allSelected = useMemo(
    () => candidates.length > 0 && selectedIds.size === candidates.length,
    [candidates.length, selectedIds.size]
  )

  async function handleCreatePlan() {
    setPlanning(true)
    setCandidates([])
    setMeta(null)
    setRunError(null)
    setSelectedIds(new Set())
    try {
      const res = await fetch("/api/research/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      const data = (await res.json()) as {
        plan?: ResearchPlanState
        error?: string
      }
      if (!res.ok || !data.plan) {
        throw new Error(data.error ?? "Impossible de créer le plan")
      }
      setPlan(data.plan)
      setOptionsOpen(true)
      toast.success("Plan prêt — vérifie puis lance la recherche")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de créer le plan"
      )
    } finally {
      setPlanning(false)
    }
  }

  async function handleRun() {
    if (!plan) return
    setRunning(true)
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as {
        candidates?: ResearchCandidate[]
        meta?: {
          live_count: number
          imported_count: number
          publiee_depuis_days: number
          source_notes: Array<{
            slug: string
            capability: string
            label: string
            detail: string
            error?: string
          }>
        }
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Recherche impossible")
      }
      const next = (data.candidates ?? []).map((c) => ({
        ...c,
        origin: c.origin === "imported" ? ("imported" as const) : ("live" as const),
      }))
      setCandidates(next)
      setMeta(data.meta ?? null)
      setSelectedIds(new Set(next.map((c) => c.id)))
      const live = data.meta?.live_count ?? 0
      const imported = data.meta?.imported_count ?? 0
      toast.success(
        `${next.length} offre(s) — ${live} live, ${imported} déjà importée(s)`
      )
      for (const note of data.meta?.source_notes ?? []) {
        if (note.error) toast.error(`${note.slug}: ${note.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recherche impossible"
      setRunError(message)
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }

  async function handleImport() {
    if (!plan) return
    const selected = candidates.filter((c) => selectedIds.has(c.id))
    if (selected.length === 0) {
      toast.error("Sélectionne au moins une offre")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/research/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidates: selected,
          min_match_score: plan.min_match_score,
        }),
      })
      const data = (await res.json()) as {
        imported?: number
        analyzed?: number
        above_threshold?: number
        below_threshold?: number
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Import impossible")
      }
      const below = data.below_threshold ?? 0
      const above = data.above_threshold ?? 0
      toast.success(
        below > 0
          ? `OK — ${above} sélectionnée(s), ${below} sous le seuil`
          : `OK — ${data.imported ?? 0} importée(s), ${data.analyzed ?? 0} analysée(s)`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import impossible")
    } finally {
      setImporting(false)
    }
  }

  function toggleSource(slug: string, checked: boolean) {
    setPlan((prev) => {
      if (!prev) return prev
      const next = checked
        ? Array.from(new Set([...prev.source_slugs, slug]))
        : prev.source_slugs.filter((s) => s !== slug)
      return {
        ...prev,
        source_slugs: next.length > 0 ? next : ["france-travail"],
      }
    })
  }

  function toggleCandidate(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <StickyPageHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-[32px] font-bold leading-10 tracking-tight text-app-text-strong">Recherche d’offres</h1>
            <p className="max-w-3xl text-lg leading-7 text-app-text-label">
              Les sources configurées interrogent un service en direct ; les autres
              filtrent tes offres importées. La prospection d’entreprises est un
              parcours distinct dans Entreprises.
            </p>
          </div>
          <PageHelpButton pageId="research" />
        </div>
      </StickyPageHeader>

      <Card className="rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-surface shadow-none">
        <CardHeader className="gap-2 p-4 pb-0">
          <CardTitle id="research-consigne-title" className="text-xl font-semibold leading-7 text-app-text-strong">
            Consigne
          </CardTitle>
          <CardDescription className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">
            Les sources « service en direct » interrogent une API configurée ; les autres filtrent uniquement les offres importées (sans scraping).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-3">
          <Label id="research-prompt-label" htmlFor="research-prompt" className="text-base font-medium leading-6 text-app-text-strong">Chat</Label>
          <Textarea
            id="research-prompt"
            aria-labelledby="research-prompt-label"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={1}
            className="h-[50px] min-h-[50px] resize-y rounded-app-date border-(length:--app-stroke) border-app-border-default bg-app-control px-3 py-3 text-base leading-6 text-app-text-strong placeholder:text-app-text-secondary focus-visible:ring-1 focus-visible:ring-app-text-secondary"
            placeholder="Décris ta recherche…"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleCreatePlan()}
              disabled={planning || prompt.trim().length < 8}
              size="control"
            >
              {planning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {planning ? "Création du plan…" : "Créer le plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <details
        className="group rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-surface"
        open={optionsOpen}
        onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
      >
        <summary className="flex min-h-[54px] cursor-pointer list-none items-center justify-between gap-4 rounded-app-surface px-4 py-3 text-lg font-medium leading-6 text-app-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3a3a3] marker:hidden [&::-webkit-details-marker]:hidden">
          Plus d’option
          <ChevronDown className="size-4 shrink-0 text-app-text-secondary transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        {plan ? (
        <div className="space-y-6 border-t border-app-border p-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold leading-7 text-app-text-strong">Plan de recherche</h2>
              <p className="text-lg font-medium leading-6 tracking-[-0.02em] text-app-text-subtle">{plan.summary_fr || "Ajuste puis lance."}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="research-roles" className="text-base font-medium text-app-text-strong">Rôle</Label>
                <Input
                  id="research-roles"
                  value={rolesToInput(plan.roles)}
                  className="h-[50px] rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-control text-base text-app-text-strong placeholder:text-app-text-muted dark:bg-app-control"
                  onChange={(event) =>
                    setPlan((prev) =>
                      prev
                        ? { ...prev, roles: parseRolesInput(event.target.value) }
                        : prev
                    )
                  }
                />
              </Field>
              <Field>
                <Label htmlFor="research-location" className="text-base font-medium text-app-text-strong">Lieu</Label>
                <Input
                  id="research-location"
                  value={plan.location}
                  onChange={(event) =>
                    setPlan((prev) =>
                      prev ? { ...prev, location: event.target.value } : prev
                    )
                  }
                  placeholder="Marseille"
                  className="h-[50px] rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-control text-base text-app-text-strong placeholder:text-app-text-muted dark:bg-app-control"
                />
              </Field>
              <Field>
                <Label htmlFor="research-hours" className="text-base font-medium text-app-text-strong">Publié depuis (heures)</Label>
                <Input
                  id="research-hours"
                  type="number"
                  min={1}
                  max={744}
                  value={plan.published_within_hours}
                  className="h-[50px] rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-control text-base text-app-text-strong dark:bg-app-control"
                  onChange={(event) =>
                    setPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            published_within_hours: Math.max(
                              1,
                              Number(event.target.value) || 1
                            ),
                          }
                        : prev
                    )
                  }
                />
              </Field>
              <Field>
                <Label htmlFor="research-score" className="text-base font-medium text-app-text-strong">Score minimum après analyse (%)</Label>
                <Input
                  id="research-score"
                  type="number"
                  min={0}
                  max={100}
                  value={plan.min_match_score ?? ""}
                  placeholder="ex. 70"
                  className="h-[50px] rounded-app-surface border-(length:--app-stroke) border-app-border-strong bg-app-control text-base text-app-text-strong placeholder:text-app-text-muted dark:bg-app-control"
                  onChange={(event) => {
                    const raw = event.target.value.trim()
                    setPlan((prev) =>
                      prev
                        ? {
                            ...prev,
                            min_match_score:
                              raw === ""
                                ? null
                                : Math.max(0, Math.min(100, Number(raw) || 0)),
                          }
                        : prev
                    )
                  }}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <Label id="research-sources-label" className="text-xl font-semibold leading-7 text-app-text-strong">Sources</Label>
              <div
                role="group"
                aria-labelledby="research-sources-label"
                className="grid gap-2 sm:grid-cols-2"
              >
                {[
                  {
                    slug: MY_IMPORTED_SOURCE.slug,
                    name: MY_IMPORTED_SOURCE.name,
                    ingestionMode: "extension" as const,
                  },
                  ...SOURCE_CATALOG,
                ].map((source) => {
                  const checked = plan.source_slugs.includes(source.slug)
                  const cap = capabilities[source.slug]
                  const isMyLibrary = source.slug === MY_IMPORTED_SOURCE.slug
                  return (
                    <div
                      key={source.slug}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-app-surface border p-4 transition-colors",
                        checked
                          ? "border-app-text-secondary bg-app-control"
                          : "border-app-border-strong bg-app-surface hover:bg-app-surface-raised"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        aria-labelledby={`research-source-${source.slug}-name`}
                        onCheckedChange={(value) =>
                          toggleSource(source.slug, value === true)
                        }
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            id={`research-source-${source.slug}-name`}
                            className="text-lg font-medium leading-6 text-app-text-strong"
                          >
                            {source.name}
                          </span>
                          <Badge variant="secondary" className="rounded-app-surface border-0 bg-app-control text-sm font-medium text-app-text-subtle">
                            {cap?.research_label ??
                              (isMyLibrary
                                ? "Bibliothèque"
                                : source.ingestionMode === "api"
                                  ? "API"
                                  : "Bibliothèque")}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-base leading-6 text-app-text-secondary">
                          {cap?.research_detail ??
                            (isMyLibrary
                              ? "Filtre tout ton board, toutes sources confondues"
                              : source.ingestionMode === "api"
                                ? "Recherche live si configurée"
                                : "Filtre tes offres déjà importées")}
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleRun()}
              disabled={running}
              size="control"
            >
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Lancer la recherche
            </Button>
          </div>
        ) : (
          <p className="text-base leading-6 text-app-text-secondary">
            Crée un plan pour ajuster ses critères et choisir les sources à consulter.
          </p>
        )}
      </details>

      {runError || meta || candidates.length > 0 ? (
        <div className="space-y-4">
          {runError ? (
            <Card role="alert" className="border-app-danger/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
                <div><p className="font-medium text-app-text-strong">La recherche n’a pas abouti.</p><p className="text-sm text-app-text-secondary">{runError}</p></div>
                <Button type="button" variant="outline" onClick={() => void handleRun()} disabled={running || !plan}>Réessayer</Button>
              </CardContent>
            </Card>
          ) : null}
          {meta ? (
            <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
              <Badge variant="outline">
                Live {meta.live_count} · Importées {meta.imported_count} · fenêtre{" "}
                {meta.publiee_depuis_days}j
              </Badge>
            </div>
          ) : null}

          {candidates.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Résultats</CardTitle>
                  <CardDescription>
                    Badge Live = nouvelle offre API. Déjà importé = déjà dans ton
                    board.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedIds(
                        allSelected
                          ? new Set()
                          : new Set(candidates.map((c) => c.id))
                      )
                    }
                  >
                    {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={importing || selectedIds.size === 0}
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Valider la sélection ({selectedIds.size})
                  </Button>
                  <Link
                    href="/jobs"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Voir les offres
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidates.map((candidate) => {
                  const checked = selectedIds.has(candidate.id)
                  return (
                    <label
                      key={candidate.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                        checked && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleCandidate(candidate.id, value === true)
                        }
                        className="mt-1"
                      />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium leading-6">
                            {candidate.title}
                          </span>
                          <Badge
                            variant={
                              candidate.origin === "live" ? "default" : "secondary"
                            }
                          >
                            {candidate.origin === "live" ? "Live" : "Déjà importé"}
                          </Badge>
                        </span>
                        <span className="block text-base text-muted-foreground">
                          {candidate.company}
                          {candidate.location ? ` · ${candidate.location}` : ""}
                        </span>
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-base text-foreground underline-offset-4 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Voir l’annonce
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </span>
                    </label>
                  )
                })}
              </CardContent>
            </Card>
          ) : !runError ? (
            <Card>
              <CardContent className="space-y-4 py-8">
                <div><p className="font-medium text-app-text-strong">Aucune offre trouvée avec ces critères.</p><p className="text-base text-app-text-secondary">Élargis le lieu ou la période, ou importe des offres si la source filtre ta bibliothèque.</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setPlan((previous) => previous ? { ...previous, published_within_hours: 744, min_match_score: null } : previous)}>Élargir la période et retirer le seuil</Button>
                  <Link href="/jobs" className="inline-flex min-h-10 items-center rounded-app-control border border-app-border-strong px-4 text-sm font-medium text-app-text">Voir les offres importées</Link>
                  <Link href="/imports" className="inline-flex min-h-10 items-center rounded-app-control border border-app-border-strong px-4 text-sm font-medium text-app-text">Importer des offres</Link>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
