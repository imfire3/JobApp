"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CvAnalysisPanel } from "@/components/settings/cv-analysis-panel"
import { CvExperiencesCard } from "@/components/settings/cv-experiences-card"
import { PageHelpButton } from "@/components/onboarding/page-help-button"
import { mergeExperiencesIntoCvText, type CvExperience } from "@/lib/cv/experiences"
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  FileUp,
  GraduationCap,
  Languages,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import type { CvAnalysisResponse } from "@/types"

const SECTIONS = [
  { id: "profil", label: "Profil", icon: UserRound },
  { id: "experiences", label: "Expériences", icon: Briefcase },
  { id: "competences", label: "Compétences", icon: GraduationCap },
  { id: "langues", label: "Langues", icon: Languages },
  { id: "analyse", label: "Analyse ATS", icon: Sparkles },
] as const

export function SettingsForm() {
  const router = useRouter()
  const [cvText, setCvText] = useState("")
  const [savedCvText, setSavedCvText] = useState("")
  const [experiences, setExperiences] = useState<CvExperience[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importingPdf, setImportingPdf] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeSection, setActiveSection] = useState<string>("profil")
  const [cvTextOpen, setCvTextOpen] = useState(false)

  const loadAnalysis = useCallback(async () => {
    setAnalysisLoading(true)
    try {
      const res = await fetch("/api/profile/analyze-cv")
      if (!res.ok) {
        setAnalysis(null)
        return
      }
      const data = (await res.json()) as { analysis: CvAnalysisResponse | null }
      setAnalysis(data.analysis ?? null)
    } catch {
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profile")
        if (!res.ok) throw new Error("Impossible de charger le profil")
        const data = await res.json()
        const profile = data.profile ?? {}
        const text = profile.cv_text ?? ""
        setCvText(text)
        setSavedCvText(text)
        setLastUpdatedAt(profile.updated_at ?? null)
      } catch {
        setCvText("")
        setSavedCvText("")
        setLastUpdatedAt(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
    void loadAnalysis()
  }, [loadAnalysis])

  const composedCvText = mergeExperiencesIntoCvText(cvText, experiences)
  const hasUnsavedCv = composedCvText !== savedCvText
  const hasSavedCv = savedCvText.trim().length > 0
  const ats = analysis?.analysis
  const detectedSkills = ats?.detected_skills ?? []
  const detectedLanguages = ats?.detected_languages ?? []
  const detectedRoles = ats?.detected_roles ?? []

  const handleSectionChange = (sectionId: string | null) => {
    if (!sectionId) return
    setActiveSection(sectionId)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const nextText = mergeExperiencesIntoCvText(cvText, experiences)
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: nextText,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Échec de l’enregistrement")
      }
      const data = await res.json()
      const text = data.profile?.cv_text ?? nextText
      setCvText(text)
      setSavedCvText(text)
      setExperiences([])
      setLastUpdatedAt(data.profile?.updated_at ?? new Date().toISOString())
      await loadAnalysis()
      toast.success("Contexte CV enregistré")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l’enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const handleImportPdf = async () => {
    if (!pdfFile) {
      toast.error("Sélectionne d’abord un fichier PDF.")
      return
    }

    setImportingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", pdfFile)

      const res = await fetch("/api/profile/import-cv", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import PDF échoué")

      const text = data.extracted_text ?? ""
      setCvText(text)
      setSavedCvText(text)
      setExperiences([])
      setLastUpdatedAt(data.profile?.updated_at ?? new Date().toISOString())
      setPdfFile(null)
      setCvTextOpen(true)
      await loadAnalysis()
      toast.success("CV importé comme contexte IA.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import PDF échoué")
    } finally {
      setImportingPdf(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Analyse CV échouée")
      }
      setAnalysis(data.analysis ?? null)
      toast.success("Analyse CV terminée")
      router.push("/profile-ai/optimize")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse CV échouée")
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
        <div className="space-y-8">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Mon CV</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Ton CV sert à personnaliser les lettres de motivation et à alimenter
            l’analyse ATS. Organise-le comme un profil candidat.
          </p>
        </div>
        <PageHelpButton pageId="cv" />
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant={hasSavedCv ? "secondary" : "outline"}>
          {hasSavedCv ? "CV enregistré" : "CV à compléter"}
        </Badge>
        <span>{hasUnsavedCv ? "Modifications non enregistrées" : "À jour"}</span>
        {lastUpdatedAt ? (
          <span className="text-xs">
            · {new Date(lastUpdatedAt).toLocaleString("fr-FR")}
          </span>
        ) : null}
      </div>

      <Tabs value={activeSection} onValueChange={handleSectionChange} className="gap-6">
        <TabsList
          aria-label="Sections du profil CV"
          className="h-auto w-full flex-wrap justify-start sm:w-fit"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <TabsTrigger key={section.id} value={section.id} className="gap-1.5 px-3 py-1.5">
                <Icon className="h-4 w-4" />
                {section.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="profil" className="mt-0 space-y-8">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-4 p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-semibold">
                      Mon profil candidat
                    </CardTitle>
                    <CardDescription className="text-base leading-7">
                      {detectedRoles[0]
                        ? `Rôle détecté : ${detectedRoles[0]}`
                        : "Importe ou colle ton CV pour enrichir le contexte"}
                    </CardDescription>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        {composedCvText.trim().length} caractères
                      </Badge>
                      {experiences.length > 0 ? (
                        <Badge variant="outline" className="px-3 py-1 text-sm">
                          {experiences.length} expérience
                          {experiences.length > 1 ? "s" : ""} à fusionner
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="rounded-2xl" data-tour="guide-cv-upload">
            <CardHeader className="space-y-2 p-6 md:p-8">
              <CardTitle className="text-xl font-semibold">Texte du CV</CardTitle>
              <CardDescription className="text-base leading-7">
                Colle ton CV une fois, puis réutilise-le pour les analyses et les
                lettres de motivation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-6 md:px-8 md:pb-8">
              <div className="space-y-4 rounded-2xl border border-border p-4 md:p-6">
                <Label className="text-base font-medium">Import PDF (optionnel)</Label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                    className="h-12 text-base sm:flex-1"
                    aria-label="Choisir un fichier PDF de CV"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleImportPdf}
                    disabled={importingPdf || !pdfFile}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {importingPdf ? "Import…" : "Importer le PDF"}
                  </Button>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  On extrait le texte du PDF. Seul le texte CV est stocké.
                </p>
              </div>

              <div className="rounded-2xl border border-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left md:px-6"
                  onClick={() => setCvTextOpen((open) => !open)}
                  aria-expanded={cvTextOpen}
                  aria-controls="cv-context-panel"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-base font-medium">Contenu du CV</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {cvText.trim().length > 0
                        ? `${cvText.trim().length} caractères — clique pour ${cvTextOpen ? "replier" : "éditer"}`
                        : "Vide — ouvre pour coller ou éditer le texte"}
                    </p>
                  </div>
                  {cvTextOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {cvTextOpen ? (
                  <div
                    id="cv-context-panel"
                    className="space-y-2 border-t border-border px-4 pb-4 pt-4 md:px-6 md:pb-6"
                  >
                    <Label htmlFor="cv-context-text" className="sr-only">
                      Contenu du CV
                    </Label>
                    <Textarea
                      id="cv-context-text"
                      value={cvText}
                      onChange={(e) => setCvText(e.target.value)}
                      rows={12}
                      placeholder="Colle ici ton expérience, tes réalisations, outils et contexte…"
                      className="max-h-[28rem] min-h-48 resize-y overflow-y-auto text-base leading-7 [field-sizing:fixed]"
                    />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiences" className="mt-0">
          <CvExperiencesCard experiences={experiences} onChange={setExperiences} />
        </TabsContent>

        <TabsContent value="competences" className="mt-0">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-2 p-6 md:p-8">
              <CardTitle className="text-xl font-semibold">
                Compétences & expertises
              </CardTitle>
              <CardDescription className="text-base leading-7">
                Issues de l’analyse ATS de ton CV enregistré. Relance l’analyse pour
                actualiser.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 md:px-8 md:pb-8">
              {detectedSkills.length > 0 ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {detectedSkills.map((skill) => (
                    <li
                      key={skill}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-base"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed p-6 text-base leading-7 text-muted-foreground">
                  Aucune compétence détectée pour l’instant. Enregistre ton CV puis
                  lance l’analyse ATS.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="langues" className="mt-0">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-2 p-6 md:p-8">
              <CardTitle className="text-xl font-semibold">Langues</CardTitle>
              <CardDescription className="text-base leading-7">
                Niveaux uniquement s’ils sont explicitement indiqués dans le CV.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 md:px-8 md:pb-8">
              {detectedLanguages.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {detectedLanguages.map((lang) => (
                    <li
                      key={`${lang.language}-${lang.level ?? ""}`}
                      className="rounded-2xl border border-border p-6"
                    >
                      <p className="text-lg font-semibold">{lang.language}</p>
                      <p className="mt-2 text-base text-muted-foreground">
                        {lang.level ?? "Niveau non précisé"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed p-6 text-base leading-7 text-muted-foreground">
                  Aucune langue détectée. Ajoute-les clairement dans ton CV (ex.
                  Français — natif).
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyse" className="mt-0">
          <CvAnalysisPanel
            analysis={analysis}
            analyzing={analyzing}
            loading={analysisLoading}
            hasUnsavedCv={hasUnsavedCv}
            hasSavedCv={hasSavedCv}
            onAnalyze={handleAnalyze}
          />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer le contexte CV"}
        </Button>
      </div>
    </div>
  )
}
