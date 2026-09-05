"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getMatchScoreColor } from "@/lib/jobs/utils"
import type { CvAnalysisResponse } from "@/types"
import { ArrowLeft, Check, Loader2, Pencil, Plus, RefreshCw, Save, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type KeywordRow = {
  keyword: string
  category: "skill" | "tool" | "role" | "industry" | "missing"
  presentBefore: boolean
  countBefore: number
  presentAfter: boolean
  countAfter: number
  added: boolean
}

function countOccurrences(text: string, keyword: string): number {
  const haystack = text.toLowerCase()
  const needle = keyword.toLowerCase().trim()
  if (!needle) return 0
  let count = 0
  let index = 0
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index)
    if (found === -1) break
    count += 1
    index = found + needle.length
  }
  return count
}

function buildRows(analysis: CvAtsSlice, cvBefore: string, cvAfter: string, added: Set<string>): KeywordRow[] {
  const entries: Array<{ keyword: string; category: KeywordRow["category"] }> = []
  const seen = new Set<string>()

  const push = (keyword: string, category: KeywordRow["category"]) => {
    const key = keyword.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    entries.push({ keyword: keyword.trim(), category })
  }

  for (const skill of analysis.detected_skills) push(skill, "skill")
  for (const tool of analysis.detected_tools) push(tool, "tool")
  for (const role of analysis.detected_roles) push(role, "role")
  for (const industry of analysis.detected_industries) push(industry, "industry")
  for (const missing of analysis.missing_product_keywords) push(missing, "missing")

  return entries.map(({ keyword, category }) => {
    const countBefore = countOccurrences(cvBefore, keyword)
    const countAfter = countOccurrences(cvAfter, keyword)
    return {
      keyword,
      category,
      presentBefore: countBefore > 0,
      countBefore,
      presentAfter: countAfter > 0,
      countAfter,
      added: added.has(keyword.toLowerCase()),
    }
  })
}

type CvAtsSlice = CvAnalysisResponse["analysis"]

const CATEGORY_LABEL: Record<KeywordRow["category"], string> = {
  skill: "Compétence",
  tool: "Outil",
  role: "Rôle",
  industry: "Industrie",
  missing: "Manquant",
}

export function CvOptimizePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null)
  const [cvBefore, setCvBefore] = useState("")
  const [cvAfter, setCvAfter] = useState("")
  const [editingAfter, setEditingAfter] = useState(false)
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, analysisRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/profile/analyze-cv"),
      ])
      const profileData = (await profileRes.json()) as {
        profile?: { cv_text?: string }
        error?: string
      }
      const analysisData = (await analysisRes.json()) as {
        analysis?: CvAnalysisResponse | null
        error?: string
      }

      if (!profileRes.ok) {
        throw new Error(profileData.error ?? "Impossible de charger le CV")
      }

      const text = profileData.profile?.cv_text ?? ""
      setCvBefore(text)
      setCvAfter(text)
      setAddedKeywords(new Set())
      setAnalysis(analysisData.analysis ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement échoué")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    if (!analysis) return []
    return buildRows(analysis.analysis, cvBefore, cvAfter, addedKeywords)
  }, [analysis, cvBefore, cvAfter, addedKeywords])

  const utilization = useMemo(() => {
    if (rows.length === 0) return { covered: 0, total: 0, percent: 0 }
    const covered = rows.filter((row) => row.presentAfter).length
    const total = rows.length
    return {
      covered,
      total,
      percent: Math.round((covered / total) * 100),
    }
  }, [rows])

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" })
      const data = (await res.json()) as {
        analysis?: CvAnalysisResponse
        error?: string
      }
      if (!res.ok || !data.analysis) {
        throw new Error(data.error ?? "Analyse CV échouée")
      }
      setAnalysis(data.analysis)
      toast.success("Analyse mise à jour")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse CV échouée")
    } finally {
      setAnalyzing(false)
    }
  }

  function handleAddKeyword(keyword: string) {
    const needle = keyword.trim()
    if (!needle) return
    if (countOccurrences(cvAfter, needle) > 0) {
      toast.message("Déjà présent dans le CV après")
      return
    }

    setCvAfter((prev) => {
      const block = `\n\n## Mots-clés ATS\n- ${needle}`
      if (/## Mots-clés ATS/i.test(prev)) {
        return `${prev.trimEnd()}\n- ${needle}`
      }
      return `${prev.trimEnd()}${block}`
    })
    setAddedKeywords((prev) => new Set(prev).add(needle.toLowerCase()))
    setEditingAfter(true)
    toast.success(`« ${needle} » ajouté au CV après`)
  }

  async function handleSaveAfter() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvAfter }),
      })
      const data = (await res.json()) as { error?: string; profile?: { cv_text?: string } }
      if (!res.ok) {
        throw new Error(data.error ?? "Enregistrement échoué")
      }
      const next = data.profile?.cv_text ?? cvAfter
      setCvBefore(next)
      setCvAfter(next)
      setAddedKeywords(new Set())
      setEditingAfter(false)
      toast.success("CV mis à jour")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement échoué")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l’optimisation CV…
      </div>
    )
  }

  if (!cvBefore.trim()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimisation CV</CardTitle>
          <CardDescription>Ajoute ton CV avant de lancer l’optimisation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/profile-ai" className={buttonVariants({})}>
            Aller à CV Context
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimisation CV</CardTitle>
          <CardDescription>
            Lance une analyse pour obtenir les mots-clés et le score d’utilisation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleAnalyze} disabled={analyzing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", analyzing && "animate-spin")} />
            {analyzing ? "Analyse…" : "Analyser le CV"}
          </Button>
          <Link href="/profile-ai" className={buttonVariants({ variant: "outline" })}>
            Retour
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/profile-ai"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            CV Context
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Optimisation CV</h1>
          <p className="text-sm text-muted-foreground">
            Compare CV avant / après, vois les mots-clés en table, et suis le taux d’utilisation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", analyzing && "animate-spin")} />
            {analyzing ? "Analyse…" : "Re-analyser"}
          </Button>
          <Button
            type="button"
            onClick={handleSaveAfter}
            disabled={saving || cvAfter === cvBefore}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer le CV après"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Utilisation mots-clés</CardDescription>
            <CardTitle className={cn("text-3xl", getMatchScoreColor(utilization.percent))}>
              {utilization.percent}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {utilization.covered} / {utilization.total} présents dans le CV après
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Score keywords (analyse)</CardDescription>
            <CardTitle
              className={cn(
                "text-3xl",
                typeof analysis.analysis.keyword_score === "number"
                  ? getMatchScoreColor(analysis.analysis.keyword_score)
                  : "text-muted-foreground"
              )}
            >
              {typeof analysis.analysis.keyword_score === "number"
                ? analysis.analysis.keyword_score
                : "n/a"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Overall{" "}
            {typeof analysis.analysis.overall_score === "number"
              ? analysis.analysis.overall_score
              : "n/a"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ajouts en cours</CardDescription>
            <CardTitle className="text-3xl">{addedKeywords.size}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Mots-clés ajoutés depuis le CV avant
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mots-clés</CardTitle>
          <CardDescription>
            Présence dans le CV avant / après. Clique « Ajouter » pour les injecter dans le CV après.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mot-clé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Avant</TableHead>
                <TableHead>Après</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.category}-${row.keyword}`}>
                  <TableCell className="max-w-[220px] whitespace-normal font-medium">
                    {row.keyword}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        row.category === "missing"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                          : undefined
                      }
                    >
                      {CATEGORY_LABEL[row.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.presentBefore ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        {row.countBefore}×
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                        Non
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.presentAfter ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        {row.countAfter}×
                        {row.added ? (
                          <Badge variant="secondary" className="ml-1">
                            ajouté
                          </Badge>
                        ) : null}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                        Non
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={row.presentAfter}
                      onClick={() => handleAddKeyword(row.keyword)}
                      aria-label={`Ajouter ${row.keyword}`}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Ajouter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CV avant</CardTitle>
            <CardDescription>Version enregistrée (lecture seule).</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={cvBefore}
              readOnly
              rows={18}
              className="h-80 max-h-80 resize-none overflow-y-auto font-mono text-sm [field-sizing:fixed]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>CV après</CardTitle>
              <CardDescription>
                Version optimisée — clique le crayon pour modifier.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant={editingAfter ? "default" : "outline"}
              onClick={() => setEditingAfter((prev) => !prev)}
              aria-label={editingAfter ? "Verrouiller l’édition" : "Modifier le CV après"}
              title={editingAfter ? "Verrouiller" : "Modifier"}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={cvAfter}
              onChange={(e) => setCvAfter(e.target.value)}
              readOnly={!editingAfter}
              rows={18}
              className={cn(
                "h-80 max-h-80 resize-none overflow-y-auto font-mono text-sm [field-sizing:fixed]",
                !editingAfter && "bg-muted/40"
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
