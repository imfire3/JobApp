"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { TrackedSearch } from "@/types"
import { ArrowLeft, Cable, CheckCircle2, AlertTriangle, Loader2, Settings2, SlidersHorizontal, Sparkles, XCircle } from "lucide-react"
import { toast } from "sonner"

type TrackedSearchPayload = {
  name: string
  enabled: boolean
  job_titles: string[]
  keywords: string[]
  excluded_keywords: string[]
  locations: string[]
  remote_preference: string
  hybrid: boolean
  on_site: boolean
  experience: string[]
  contract_types: string[]
  minimum_salary: number | null
  currency: string
  industries: string[]
  excluded_industries: string[]
  company_size: string | null
  company_culture: string | null
  ai_preferences: Record<string, unknown>
  minimum_match_score: number | null
}

type ConnectorSource = {
  id: string
  name: string
  slug: string
  status: string
  enabled: boolean
  latest_run?: {
    status: string
    started_at: string
    error_message: string | null
  } | null
}

const emptySearch: TrackedSearchPayload = {
  name: "",
  enabled: true,
  job_titles: [],
  keywords: [],
  excluded_keywords: [],
  locations: [],
  remote_preference: "any",
  hybrid: false,
  on_site: false,
  experience: [],
  contract_types: [],
  minimum_salary: null,
  currency: "EUR",
  industries: [],
  excluded_industries: [],
  company_size: null,
  company_culture: null,
  ai_preferences: {},
  minimum_match_score: null,
}

const parseCsv = (value: string): string[] =>
  value.split(",").map((v) => v.trim()).filter(Boolean)

type TrackedSearchFormPageProps = {
  searchId?: string
}

export const TrackedSearchFormPage = ({ searchId }: TrackedSearchFormPageProps) => {
  const router = useRouter()
  const isEdit = Boolean(searchId)
  const [form, setForm] = useState<TrackedSearchPayload>(emptySearch)
  const [connectors, setConnectors] = useState<ConnectorSource[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("connectors")

  const connectedCount = useMemo(
    () => connectors.filter((source) => source.status === "connected").length,
    [connectors]
  )
  const issueCount = useMemo(
    () =>
      connectors.filter(
        (source) => source.status === "error" || source.status === "not_configured"
      ).length,
    [connectors]
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const sourcesRes = await fetch("/api/sources")
        const sourcesData = (await sourcesRes.json().catch(() => ({}))) as {
          sources?: ConnectorSource[]
          error?: string
        }
        if (!sourcesRes.ok) {
          throw new Error(sourcesData.error ?? "Failed to load connectors")
        }
        if (!cancelled) {
          setConnectors(sourcesData.sources ?? [])
        }

        if (searchId) {
          const searchesRes = await fetch("/api/tracked-searches")
          const searchesData = (await searchesRes.json().catch(() => ({}))) as {
            tracked_searches?: TrackedSearch[]
            error?: string
          }
          if (!searchesRes.ok) {
            throw new Error(searchesData.error ?? "Failed to load search")
          }
          const found = (searchesData.tracked_searches ?? []).find(
            (item) => item.id === searchId
          )
          if (!found) {
            throw new Error("Search not found")
          }
          if (!cancelled) {
            setForm({
              name: found.name,
              enabled: found.enabled,
              job_titles: found.job_titles ?? [],
              keywords: found.keywords ?? [],
              excluded_keywords: found.excluded_keywords ?? [],
              locations: found.locations ?? [],
              remote_preference: found.remote_preference ?? "any",
              hybrid: found.hybrid ?? false,
              on_site: found.on_site ?? false,
              experience: found.experience ?? [],
              contract_types: found.contract_types ?? [],
              minimum_salary: found.minimum_salary ?? null,
              currency: found.currency ?? "EUR",
              industries: found.industries ?? [],
              excluded_industries: found.excluded_industries ?? [],
              company_size: found.company_size ?? null,
              company_culture: found.company_culture ?? null,
              ai_preferences: found.ai_preferences ?? {},
              minimum_match_score: found.minimum_match_score ?? null,
            })
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load form")
        if (searchId) router.replace("/jobs")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [searchId, router])

  const handleSave = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Search name must be at least 2 characters")
      return
    }

    setSaving(true)
    try {
      const endpoint = isEdit
        ? `/api/tracked-searches/${searchId}`
        : "/api/tracked-searches"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save search")
      }
      toast.success(isEdit ? "Search updated" : "Search created")
      router.push("/jobs")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save search")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading search form…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link href="/jobs" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 w-fit" })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? "Edit tracked search" : "New tracked search"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Define criteria once. Automatic collection runs every day at 08:00 on enabled
          connectors.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="connectors" className="gap-1.5">
            <Cable className="h-3.5 w-3.5" />
            Connectors
            <Badge
              variant={issueCount > 0 ? "destructive" : "secondary"}
              className="ml-1"
            >
              {connectedCount}/{connectors.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="criteria" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Criteria
          </TabsTrigger>
          <TabsTrigger value="filters" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Filters
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cable className="h-4 w-4" />
                Connexion aux services
              </CardTitle>
              <CardDescription>
                Statut des sources utilisées pour la collecte automatique. La
                configuration se fait dans Sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectors.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Aucun connector. Va dans Sources pour en configurer.
                </p>
              ) : (
                <>
                  {issueCount === 0 ? (
                    <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          Tous les services sont connectés
                        </p>
                        <p className="text-xs text-muted-foreground">
                          La collecte pourra tourner sur {connectedCount} source
                          {connectedCount > 1 ? "s" : ""}.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {issueCount} service{issueCount > 1 ? "s" : ""} à corriger
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Certains connectors ne sont pas prêts — détails ci-dessous.
                        </p>
                      </div>
                    </div>
                  )}

                  {connectors.map((source) => {
                    const isConnected = source.status === "connected"
                    const isError = source.status === "error"
                    const runError = source.latest_run?.error_message

                    return (
                      <div
                        key={source.id}
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                          isConnected
                            ? "border-border"
                            : isError
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-amber-500/30 bg-amber-500/5"
                        }`}
                      >
                        {isConnected ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        ) : isError ? (
                          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{source.name}</p>
                            <Badge variant="outline">{source.slug}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {isConnected
                              ? "Connecté — prêt pour la collecte"
                              : isError
                                ? "Erreur de connexion"
                                : "Non configuré"}
                          </p>
                          {!isConnected && (runError || isError) ? (
                            <p className="mt-1 text-xs text-destructive">
                              {runError ?? "Vérifie la config dans Sources."}
                            </p>
                          ) : null}
                          {source.status === "not_configured" ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Configure ce connector dans Sources pour l’activer.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Criteria</CardTitle>
              <CardDescription>
                Nom, titres, mots-clés et localisations de la recherche.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="search-name">Search name</Label>
                  <Input
                    id="search-name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Product Owner Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Job titles (comma separated)</Label>
                  <Input
                    value={form.job_titles.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, job_titles: parseCsv(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <Input
                    value={form.keywords.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, keywords: parseCsv(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Excluded keywords</Label>
                  <Input
                    value={form.excluded_keywords.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        excluded_keywords: parseCsv(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <Input
                    value={form.locations.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, locations: parseCsv(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Salaire, contrat, remote, taille d’entreprise et industries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum salary</Label>
                  <Input
                    type="number"
                    value={form.minimum_salary ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minimum_salary: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contract types</Label>
                  <Input
                    value={form.contract_types.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        contract_types: parseCsv(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Experience level</Label>
                  <Input
                    value={form.experience.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, experience: parseCsv(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remote preference</Label>
                  <Input
                    value={form.remote_preference}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        remote_preference: e.target.value,
                      }))
                    }
                    placeholder="any | remote | hybrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company size</Label>
                  <Input
                    value={form.company_size ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        company_size: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Industries</Label>
                  <Input
                    value={form.industries.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, industries: parseCsv(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Excluded industries</Label>
                  <Input
                    value={form.excluded_industries.join(", ")}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        excluded_industries: parseCsv(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Advanced</CardTitle>
              <CardDescription>
                Culture, préférences IA, score minimum et options de la recherche.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Company culture</Label>
                  <Textarea
                    rows={3}
                    value={form.company_culture ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        company_culture: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>AI preferences (JSON)</Label>
                  <Textarea
                    rows={5}
                    value={JSON.stringify(form.ai_preferences, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value || "{}") as Record<
                          string,
                          unknown
                        >
                        setForm((prev) => ({ ...prev, ai_preferences: parsed }))
                      } catch {
                        // keep editing resilient
                      }
                    }}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum AI match score</Label>
                  <Input
                    type="number"
                    value={form.minimum_match_score ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        minimum_match_score: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 rounded-md border px-3 py-3 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="search-enabled"
                      checked={form.enabled}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, enabled: checked }))
                      }
                    />
                    <Label htmlFor="search-enabled">Search enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="search-hybrid"
                      checked={form.hybrid}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, hybrid: checked }))
                      }
                    />
                    <Label htmlFor="search-hybrid">Hybrid</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="search-onsite"
                      checked={form.on_site}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, on_site: checked }))
                      }
                    />
                    <Label htmlFor="search-onsite">On-site</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pb-8">
        <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create search"}
        </Button>
      </div>
    </div>
  )
}
