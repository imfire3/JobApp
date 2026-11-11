"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Building2,
  Download,
  Loader2,
  Play,
  Plus,
  Sparkles,
} from "lucide-react"
import { AppShell } from "@/components/layout/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHelpButton } from "@/components/onboarding/page-help-button"
import { StickyPageHeader } from "@/components/layout/sticky-page-header"
import { CompanyCard } from "@/components/companies/company-card"
import {
  PIPELINE_STATUS_LABEL,
} from "@/components/companies/company-labels"
import type { Company, CompanyPipelineStatus, CompanySearchCriteria } from "@/types"
import { toast } from "sonner"

const PIPELINE_STATUSES: CompanyPipelineStatus[] = [
  "to_contact",
  "contact_found",
  "message_prepared",
  "application_sent",
  "follow_up_pending",
  "response_received",
  "interview",
  "refused",
  "opportunity",
]

const SEARCH_STEPS = [
  "Analyse de ton profil…",
  "Compréhension de ta recherche…",
  "Recherche des entreprises…",
  "Analyse des entreprises trouvées…",
  "Calcul de la compatibilité…",
  "Sélection des meilleures opportunités…",
]

const STEP_MAP: Record<string, number> = {
  running: 0,
  profile: 0,
  criteria: 1,
  search: 2,
  enrich: 3,
  score: 4,
  select: 5,
  done: 5,
}

function splitComma(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function dedupeCompanies(items: Company[]): Company[] {
  const unique = new Map<string, Company>()
  for (const company of items) {
    const domain = company.domain?.trim().toLowerCase().replace(/^www\./, "")
    const name = company.name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
    const key = domain || name
    if (key && (!unique.has(key) || (!unique.get(key)?.website && company.website))) unique.set(key, company)
  }
  return Array.from(unique.values())
}

export function CompanySearchPage() {
  const [criteria, setCriteria] = useState<CompanySearchCriteria>({
    roles: ["Product Owner", "Product Manager"],
    sectors: [],
    locations: [],
    size_min: null,
    size_max: null,
    remote: false,
    priority: "",
    summary_fr: "",
  })
  const [running, setRunning] = useState(false)
  const [searchCompleted, setSearchCompleted] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<Company[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [view, setView] = useState<"prospect" | "pipeline">("prospect")
  const [searchStep, setSearchStep] = useState(-1)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const [rolesLine, setRolesLine] = useState("Product Owner, Product Manager")
  const [sectorsLine, setSectorsLine] = useState("")
  const [locationsLine, setLocationsLine] = useState("")
  const [sizeMin, setSizeMin] = useState("")
  const [sizeMax, setSizeMax] = useState("")
  const [summary, setSummary] = useState("")

  async function loadCompanies({ silent }: { silent?: boolean } = {}) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/companies")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les entreprises")
      setCompanies(data.companies ?? [])
    } catch (error) {
      setCompanies([])
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger les entreprises"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data bootstrap on mount
    void loadCompanies()
  }, [])

  async function handleRun() {
    if (!criteria) return
    setRunning(true)
    setSearchStep(0)
    setResults([])
    setSearchCompleted(false)
    setSearchError(null)
    setProgress({ current: 0, total: 0 })
    try {
      const res = await fetch("/api/searches/companies/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Impossible de lancer la recherche")
      }

      if (!res.body) throw new Error("Stream vide")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        let eventType = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ")) {
            const rawData = line.slice(6)
            try {
              const parsed = JSON.parse(rawData)
              if (eventType === "step") {
                const stepIdx = STEP_MAP[parsed.step]
                if (stepIdx !== undefined) setSearchStep(stepIdx)
              } else if (eventType === "company") {
                setProgress({ current: parsed.index, total: parsed.total })
                setResults((prev) => {
                  const exists = prev.some((c) => c.id === parsed.company.id)
                  if (exists) return prev
                  return [...prev, parsed.company]
                })
              } else if (eventType === "done") {
                setSearchCompleted(true)
                setLastProvider(parsed.provider ?? "mock")
                setSearchStep(SEARCH_STEPS.length - 1)
                await loadCompanies({ silent: true })
                toast.success(
                  `${parsed.total ?? 0} entreprise(s) ajoutée(s) à ton CRM`
                )
              } else if (eventType === "error") {
                const message = parsed.error ?? "Erreur serveur"
                setSearchError(message)
                setSearchCompleted(true)
                toast.error(message)
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de lancer la recherche"
      setSearchError(message)
      setSearchCompleted(true)
      toast.error(message)
    } finally {
      setRunning(false)
      setTimeout(() => setSearchStep(-1), 1500)
    }
  }

  function updateCriteria(patch: Partial<CompanySearchCriteria>) {
    setCriteria((prev) => (prev ? { ...prev, ...patch } : prev))
    setSummary(patch.summary_fr ?? summary)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch("/api/companies/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: displayCompanies.map((c) => c.id) }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Erreur d'export")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `entreprises-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export téléchargé")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur d'export")
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteCompany(companyId: string) {
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Impossible de supprimer")
      }
      setCompanies((prev) => prev.filter((c) => c.id !== companyId))
      setResults((prev) => prev.filter((c) => c.id !== companyId))
      toast.success("Entreprise supprimée")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer")
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<CompanyPipelineStatus, Company[]>()
    for (const status of PIPELINE_STATUSES) map.set(status, [])
    for (const company of dedupeCompanies(companies)) map.get(company.status)?.push(company)
    return map
  }, [companies])

  const displayCompanies = dedupeCompanies(companies)
  const prospectCompanies = dedupeCompanies(
    searchCompleted ? results : displayCompanies.filter((company) => company.search_id)
  )
    .slice(0, 10)
    .sort((a, b) => {
      if (a.discovery_type === "offer_detected" && b.discovery_type !== "offer_detected") return -1
      if (a.discovery_type !== "offer_detected" && b.discovery_type === "offer_detected") return 1
      return 0
    })

  return (
    <AppShell>
      <div className="space-y-6">
        <StickyPageHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[32px] font-bold leading-10 tracking-tight text-app-text-strong">Entreprises</h1>
              <p className="text-base leading-6 text-app-text-secondary">
                Trouve des entreprises pour une candidature spontanée. Pour chercher un poste publié, utilise Recherche d’offres.
              </p>
            </div>
            <PageHelpButton pageId="companies" />
          </div>
        </StickyPageHeader>

            {running && searchStep >= 0 ? (
              <Card className="rounded-app-surface border-app-border bg-app-surface shadow-none">
                <CardContent className="space-y-3 p-4" aria-live="polite">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-app-text-strong">
                      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                      {SEARCH_STEPS[searchStep] ?? "Recherche…"}
                    </span>
                    {progress.total > 0 ? (
                      <span className="shrink-0 tabular-nums text-app-text-secondary">
                        {progress.current} / {progress.total}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-app-control"
                    role="progressbar"
                    aria-label="Progression de la recherche d’entreprises"
                    aria-valuemin={progress.total > 0 ? 0 : undefined}
                    aria-valuemax={progress.total > 0 ? progress.total : undefined}
                    aria-valuenow={progress.total > 0 ? progress.current : undefined}
                    aria-valuetext={SEARCH_STEPS[searchStep] ?? "Recherche en cours"}
                  >
                    <div
                      className={progress.total > 0
                        ? "h-full rounded-full bg-primary transition-[width] duration-300"
                        : "h-full w-1/4 animate-pulse rounded-full bg-primary motion-reduce:animate-none"}
                      style={progress.total > 0 ? { width: `${Math.max(4, (progress.current / progress.total) * 100)}%` } : undefined}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-app-surface border-(length:--app-stroke) border-app-border bg-app-surface shadow-none">
              <CardHeader className="gap-1 p-4 pb-0">
                <CardTitle className="text-lg font-medium leading-6 text-app-text-strong">
                  Quelles entreprises souhaites-tu cibler ?
                </CardTitle>
                <p className="text-sm leading-5 text-app-text-secondary">
                  Précise les postes et les entreprises qui t’intéressent pour orienter la recherche.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="crit-roles" className="text-sm font-medium text-app-text-strong">Poste ou entreprise</Label>
                      <Input
                        id="crit-roles"
                        variant="control"
                        value={rolesLine}
                        placeholder="Product Owner, entreprise…"
                        onChange={(e) => {
                          setRolesLine(e.target.value)
                          updateCriteria({ roles: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crit-sectors" className="text-sm font-medium text-app-text-strong">Secteurs d’activité</Label>
                      <Input
                        id="crit-sectors"
                        variant="control"
                        value={sectorsLine}
                        placeholder="Banque, assurance, santé…"
                        onChange={(e) => {
                          setSectorsLine(e.target.value)
                          updateCriteria({ sectors: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crit-locations" className="text-sm font-medium text-app-text-strong">Villes ou régions</Label>
                      <Input
                        id="crit-locations"
                        variant="control"
                        value={locationsLine}
                        placeholder="Marseille, Aix-en-Provence…"
                        onChange={(e) => {
                          setLocationsLine(e.target.value)
                          updateCriteria({ locations: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                      <div className="space-y-2">
                        <Label id="crit-company-size-label" className="text-sm font-medium text-app-text-strong">Taille de l’entreprise</Label>
                        <Select
                          value={sizeMin === "1" && sizeMax === "50" ? "small" : sizeMin === "51" && sizeMax === "500" ? "medium" : sizeMin === "501" && sizeMax === "" ? "large" : "all"}
                          onValueChange={(value) => {
                            const bands: Record<string, [string, string]> = {
                              all: ["", ""], small: ["1", "50"], medium: ["51", "500"], large: ["501", ""],
                            }
                            const [min, max] = (value ? bands[value] : undefined) ?? ["", ""]
                            setSizeMin(min)
                            setSizeMax(max)
                            updateCriteria({ size_min: min ? Number(min) : null, size_max: max ? Number(max) : null })
                          }}
                        >
                          <SelectTrigger aria-labelledby="crit-company-size-label" variant="control">
                            <SelectValue placeholder="Toutes les tailles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Toutes les tailles</SelectItem>
                            <SelectItem value="small">Petite</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="large">Grande</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crit-summary" className="text-sm font-medium text-app-text-strong">Autres critères ou exclusions (facultatif)</Label>
                    <Textarea
                      id="crit-summary"
                      rows={3}
                      className="min-h-[82px] resize-y rounded-app-control border-app-border bg-app-control text-sm text-app-text placeholder:text-app-text-muted"
                      placeholder="Ex. Je privilégie les PME. Je souhaite éviter les cabinets de conseil et les ESN."
                      value={summary}
                      onChange={(e) => {
                        setSummary(e.target.value)
                        updateCriteria({ summary_fr: e.target.value })
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                    {lastProvider ? <p className="mr-auto text-xs text-app-text-muted">Dernière source : {lastProvider}</p> : null}
                    <Button type="button" size="control" onClick={() => void handleRun()} disabled={running}>
                      {running ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recherche en cours…
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Rechercher des entreprises
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

          <Tabs
            defaultValue="prospect"
            value={view}
            onValueChange={(value) => setView(value as "prospect" | "pipeline")}
          >
              <TabsList variant="section" className="h-auto w-fit max-w-full flex-wrap gap-1">
                <TabsTrigger value="prospect" variant="section">
                  <Sparkles className="size-4" aria-hidden />
                  Rechercher des entreprises
                </TabsTrigger>
                <TabsTrigger value="pipeline" variant="section">
                  <Building2 className="size-4" aria-hidden />
                  Mon suivi <span className="tabular-nums">({companies.length})</span>
                </TabsTrigger>
              </TabsList>

          <TabsContent value="prospect" className="mt-4 space-y-4">
            {searchError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-app-surface border border-app-danger/40 bg-app-surface p-4">
                <div><p className="font-medium text-app-text-strong">La prospection n’a pas abouti.</p><p className="text-sm text-app-text-secondary">{searchError}</p></div>
                <Button type="button" variant="outline" onClick={() => void handleRun()} disabled={running}>Réessayer</Button>
              </div>
            ) : null}
            {prospectCompanies.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="rounded-app-badge bg-app-action text-app-action-foreground">{prospectCompanies.length}</Badge>
                  <h2 className="text-xl font-semibold leading-7 tracking-tight text-app-text-strong">
                    Entreprises candidates
                  </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {prospectCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onDelete={handleDeleteCompany}
                    />
                  ))}
                </div>
              </section>
            ) : searchCompleted ? (
              <div className="rounded-app-surface border border-app-border bg-app-surface px-4 py-8 text-center" role="status">
                <p className="text-base font-medium leading-6 text-app-text-strong">Aucune entreprise trouvée pour cette recherche.</p>
                <p className="mt-1 text-sm leading-5 text-app-text-secondary">Élargis les postes, secteurs ou régions, ou passe à la recherche d’offres pour chercher un poste publié.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => { setSectorsLine(""); setLocationsLine(""); setCriteria((current) => ({ ...current, sectors: [], locations: [] })); setSearchCompleted(false) }}>Élargir secteurs et lieux</Button>
                  <Button type="button" onClick={() => void handleRun()} disabled={running}>Relancer la prospection</Button>
                  <Link href="/research" className="inline-flex min-h-10 items-center rounded-app-control border border-app-border-strong px-4 text-sm font-medium text-app-text">Recherche d’offres</Link>
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {PIPELINE_STATUSES.slice(0, 5).map((status) => (
                  <div
                    key={status}
                    className="min-w-[220px] flex-1 rounded-app-surface border border-app-border bg-app-surface/60 p-3"
                  >
                    <div className="mb-3 h-5 w-24 animate-pulse rounded bg-app-control" />
                    <div className="space-y-2">
                      <div className="h-16 animate-pulse rounded-lg bg-app-control" />
                      <div className="h-16 animate-pulse rounded-lg bg-app-control" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayCompanies.length === 0 ? (
              <div className="rounded-app-surface border border-dashed border-app-border p-10 text-center space-y-4">
                <p className="text-base text-app-text-secondary">
                  Aucune entreprise prospectée pour l’instant. Lance une recherche sur
                  l’onglet Prospecter.
                </p>
                <Button type="button" size="control" onClick={() => setView("prospect")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Prospecter
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-app-text-secondary">
                    {displayCompanies.length} entreprise(s) dans le pipeline
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleExport()}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-3.5 w-3.5" />
                    )}
                    Export Excel
                  </Button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                {PIPELINE_STATUSES.map((status) => {
                  const columnCompanies = grouped.get(status) ?? []
                  return (
                    <section
                      key={status}
                      className="flex min-w-[260px] max-w-[320px] flex-1 flex-col rounded-app-surface border border-app-border bg-app-surface/50 p-3"
                    >
                      <header className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-app-text-strong">
                          {PIPELINE_STATUS_LABEL[status]}
                        </h3>
                        <span className="rounded-full bg-app-control px-2 py-0.5 text-base text-app-text-secondary">
                          {columnCompanies.length}
                        </span>
                      </header>
                      <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                        {columnCompanies.length === 0 ? (
                          <p className="rounded-app-control border border-dashed border-app-border px-3 py-6 text-center text-base text-app-text-secondary">
                            Aucune
                          </p>
                        ) : (
                          columnCompanies.map((company) => (
                            <div key={company.id}>
                              <CompanyCard
                                company={company}
                                onDelete={handleDeleteCompany}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
