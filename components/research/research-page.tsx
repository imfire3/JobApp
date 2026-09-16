"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  WandSparkles,
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

const EXAMPLE_PROMPTS = [
  "Trouve-moi toutes les nouvelles offres Product Owner / PM à Marseille depuis 48h et importe uniquement celles avec un score supérieur à 70 %.",
  "Product Manager remote France, publiées depuis 7 jours, score ≥ 65 %.",
  "Offres PO / PM à Paris et Lyon depuis 3 jours, toutes les sources.",
]

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
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0] ?? "")
  const [plan, setPlan] = useState<ResearchPlanState | null>(null)
  const [planning, setPlanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [importing, setImporting] = useState(false)
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
      toast.error(
        error instanceof Error ? error.message : "Recherche impossible"
      )
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
            <h1 className="text-2xl font-semibold tracking-tight">Recherche IA</h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Décris ta recherche. Les sources avec API partent en live ; sans API,
              on filtre tes offres déjà importées. Tu valides, puis le score match
              s’applique.
            </p>
          </div>
          <PageHelpButton pageId="research" />
        </div>
      </StickyPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WandSparkles className="h-5 w-5" />
            Consigne
          </CardTitle>
          <CardDescription>
            Sources sans API = bibliothèque importée uniquement (pas de scrape).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="text-base"
            placeholder="Décris ta recherche…"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <Button
                key={example}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPrompt(example)}
              >
                Exemple
              </Button>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => void handleCreatePlan()}
            disabled={planning || prompt.trim().length < 8}
          >
            {planning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Créer le plan
          </Button>
        </CardContent>
      </Card>

      {plan ? (
        <Card>
          <CardHeader>
            <CardTitle>Plan de recherche</CardTitle>
            <CardDescription>{plan.summary_fr || "Ajuste puis lance."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="research-roles">Rôles</Label>
                <Input
                  id="research-roles"
                  value={rolesToInput(plan.roles)}
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
                <Label htmlFor="research-location">Lieu</Label>
                <Input
                  id="research-location"
                  value={plan.location}
                  onChange={(event) =>
                    setPlan((prev) =>
                      prev ? { ...prev, location: event.target.value } : prev
                    )
                  }
                  placeholder="Marseille"
                />
              </Field>
              <Field>
                <Label htmlFor="research-hours">Publié depuis (heures)</Label>
                <Input
                  id="research-hours"
                  type="number"
                  min={1}
                  max={744}
                  value={plan.published_within_hours}
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
                <Label htmlFor="research-score">Score min après analyse (%)</Label>
                <Input
                  id="research-score"
                  type="number"
                  min={0}
                  max={100}
                  value={plan.min_match_score ?? ""}
                  placeholder="ex. 70"
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
              <Label>Sources</Label>
              <div className="grid gap-2 sm:grid-cols-2">
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
                    <label
                      key={source.slug}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3",
                        checked && "border-primary bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleSource(source.slug, value === true)
                        }
                      />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {cap?.research_label ??
                              (isMyLibrary
                                ? "Bibliothèque"
                                : source.ingestionMode === "api"
                                  ? "API"
                                  : "Bibliothèque")}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-base text-muted-foreground">
                          {cap?.research_detail ??
                            (isMyLibrary
                              ? "Filtre tout ton board, toutes sources confondues"
                              : source.ingestionMode === "api"
                                ? "Recherche live si configurée"
                                : "Filtre tes offres déjà importées")}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            <Button type="button" onClick={() => void handleRun()} disabled={running}>
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Lancer la recherche
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {meta || candidates.length > 0 ? (
        <div className="space-y-4">
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
          ) : (
            <Card>
              <CardContent className="py-8 text-base text-muted-foreground">
                Aucun résultat. Importe des offres ou configure une API (France
                Travail / Apify).
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}
