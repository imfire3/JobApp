"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
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
  const [remote, setRemote] = useState(false)
  const [priority, setPriority] = useState("")
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
                setLastProvider(parsed.provider ?? "mock")
                setSearchStep(SEARCH_STEPS.length - 1)
                await loadCompanies({ silent: true })
                toast.success(
                  `${parsed.total ?? 0} entreprise(s) ajoutée(s) à ton CRM`
                )
              } else if (eventType === "error") {
                throw new Error(parsed.error ?? "Erreur serveur")
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer la recherche")
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
        body: JSON.stringify({ companyIds: companies.map((c) => c.id) }),
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
    for (const company of companies) map.get(company.status)?.push(company)
    return map
  }, [companies])

  const prospectCompanies = (
    results.length > 0 ? results : companies.filter((company) => company.search_id)
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
              <h1 className="text-2xl font-bold tracking-tight">Entreprises</h1>
              <p className="text-base text-muted-foreground">
                Candidatures spontanées : trouve des entreprises, évalue l’opportunité
                et suis ta prospection.
              </p>
            </div>
            <PageHelpButton pageId="companies" />
          </div>
        </StickyPageHeader>

        <Tabs
          defaultValue="prospect"
          value={view}
          onValueChange={(value) => setView(value as "prospect" | "pipeline")}
        >
          <TabsList>
            <TabsTrigger value="prospect">
              <Sparkles className="mr-2 h-4 w-4" />
              Prospecter
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <Building2 className="mr-2 h-4 w-4" />
              Pipeline · {companies.length}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prospect" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Critères de recherche</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="crit-roles">Postes visés (virgules)</Label>
                      <Input
                        id="crit-roles"
                        value={rolesLine}
                        onChange={(e) => {
                          setRolesLine(e.target.value)
                          updateCriteria({ roles: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crit-sectors">Secteurs (virgules)</Label>
                      <Input
                        id="crit-sectors"
                        value={sectorsLine}
                        onChange={(e) => {
                          setSectorsLine(e.target.value)
                          updateCriteria({ sectors: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crit-locations">Villes / régions (virgules)</Label>
                      <Input
                        id="crit-locations"
                        value={locationsLine}
                        onChange={(e) => {
                          setLocationsLine(e.target.value)
                          updateCriteria({ locations: splitComma(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="crit-size-min">Taille min (salariés)</Label>
                        <Input
                          id="crit-size-min"
                          type="number"
                          min={1}
                          value={sizeMin}
                          onChange={(e) => {
                            setSizeMin(e.target.value)
                            updateCriteria({
                              size_min: e.target.value ? Number(e.target.value) : null,
                            })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crit-size-max">Taille max (salariés)</Label>
                        <Input
                          id="crit-size-max"
                          type="number"
                          min={1}
                          value={sizeMax}
                          onChange={(e) => {
                            setSizeMax(e.target.value)
                            updateCriteria({
                              size_max: e.target.value ? Number(e.target.value) : null,
                            })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="crit-remote"
                      checked={remote}
                      onCheckedChange={(checked) => {
                        setRemote(Boolean(checked))
                        updateCriteria({ remote: Boolean(checked) })
                      }}
                    />
                    <Label htmlFor="crit-remote" className="font-medium">
                      Télétravail / remote souhaité
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crit-priority">Priorité (optionnel)</Label>
                    <Input
                      id="crit-priority"
                      value={priority}
                      placeholder="Ex. : entreprises tech / produit, forte culture produit"
                      onChange={(e) => {
                        setPriority(e.target.value)
                        updateCriteria({ priority: e.target.value || undefined })
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crit-summary">Résumé</Label>
                    <Textarea
                      id="crit-summary"
                      rows={2}
                      value={summary}
                      onChange={(e) => {
                        setSummary(e.target.value)
                        updateCriteria({ summary_fr: e.target.value })
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-sm text-muted-foreground">
                      {rolesLine.trim() || "Rôles par défaut"} · {criteria.sectors.length} secteur(s)
                      {lastProvider ? ` · source : ${lastProvider}` : ""}
                    </p>
                    <Button type="button" onClick={() => void handleRun()} disabled={running}>
                      {running ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Recherche en cours…
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Lancer la recherche
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

            {running && searchStep >= 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {SEARCH_STEPS[searchStep] ?? "Recherche…"}
                      </span>
                      {progress.total > 0 ? (
                        <span className="text-muted-foreground">
                          {progress.current} / {progress.total}
                        </span>
                      ) : null}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{
                          width: progress.total > 0
                            ? `${Math.round((progress.current / progress.total) * 100)}%`
                            : searchStep <= 2 ? "30%" : "60%",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {prospectCompanies.length > 0 ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Entreprises candidates
                  </h2>
                  <Badge variant="secondary">{prospectCompanies.length}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {prospectCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onDelete={handleDeleteCompany}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4">
            {loading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {PIPELINE_STATUSES.slice(0, 5).map((status) => (
                  <div
                    key={status}
                    className="min-w-[220px] flex-1 rounded-xl border bg-muted/40 p-3"
                  >
                    <div className="mb-3 h-5 w-24 animate-pulse rounded bg-muted" />
                    <div className="space-y-2">
                      <div className="h-16 animate-pulse rounded-lg bg-muted" />
                      <div className="h-16 animate-pulse rounded-lg bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center space-y-4">
                <p className="text-base text-muted-foreground">
                  Aucune entreprise prospectée pour l’instant. Lance une recherche sur
                  l’onglet Prospecter.
                </p>
                <Button type="button" onClick={() => setView("prospect")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Prospecter
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {companies.length} entreprise(s) dans le pipeline
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
                      className="flex min-w-[260px] max-w-[320px] flex-1 flex-col rounded-xl border bg-muted/30 p-3"
                    >
                      <header className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold">
                          {PIPELINE_STATUS_LABEL[status]}
                        </h3>
                        <span className="rounded-full bg-background px-2 py-0.5 text-base text-muted-foreground">
                          {columnCompanies.length}
                        </span>
                      </header>
                      <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                        {columnCompanies.length === 0 ? (
                          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-base text-muted-foreground">
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