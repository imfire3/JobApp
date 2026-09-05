"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMatchScoreColor } from "@/lib/jobs/utils";
import type { CvAnalysisResponse, CvAnalysisSeverity } from "@/types";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface CvAnalysisPanelProps {
  analysis: CvAnalysisResponse | null;
  analyzing: boolean;
  loading: boolean;
  hasUnsavedCv: boolean;
  hasSavedCv: boolean;
  onAnalyze: () => void;
}

const SEVERITY_ORDER: Record<CvAnalysisSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function severityBadgeClass(severity: CvAnalysisSeverity): string {
  if (severity === "high") return "bg-destructive/10 text-destructive border-destructive/20";
  if (severity === "medium") return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  return "bg-muted text-muted-foreground";
}

function ScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">{label}</p>
      {typeof score === "number" ? (
        <p className={`mt-2 text-3xl font-semibold ${getMatchScoreColor(score)}`}>{score}</p>
      ) : (
        <p className="mt-2 text-3xl font-semibold text-muted-foreground">n/a</p>
      )}
    </div>
  )
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-base text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className="space-y-2 text-base leading-7 text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>• {item}</li>
      ))}
    </ul>
  )
}

export function CvAnalysisPanel({
  analysis,
  analyzing,
  loading,
  hasUnsavedCv,
  hasSavedCv,
  onAnalyze,
}: CvAnalysisPanelProps) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);

  useEffect(() => {
    async function loadPrompt() {
      setPromptLoading(true);
      try {
        const res = await fetch("/api/profile/cv-analysis-prompt");
        if (!res.ok) return;
        const data = (await res.json()) as {
          prompt?: string;
          default_prompt?: string;
          is_custom?: boolean;
          cv_analysis?: {
            prompt?: string;
            default_prompt?: string;
            is_custom?: boolean;
          };
        };
        const next = data.cv_analysis?.prompt ?? data.prompt ?? "";
        setPrompt(next);
        setSavedPrompt(next);
        setDefaultPrompt(data.cv_analysis?.default_prompt ?? data.default_prompt ?? "");
        setIsCustomPrompt(Boolean(data.cv_analysis?.is_custom ?? data.is_custom));
      } catch {
        // keep empty — analysis still works with server default
      } finally {
        setPromptLoading(false);
      }
    }
    void loadPrompt();
  }, []);

  async function handleSavePrompt() {
    setPromptSaving(true);
    try {
      const res = await fetch("/api/profile/cv-analysis-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save prompt");
      const next = data.prompt ?? prompt;
      setPrompt(next);
      setSavedPrompt(next);
      setDefaultPrompt(data.default_prompt ?? defaultPrompt);
      setIsCustomPrompt(Boolean(data.is_custom));
      toast.success(data.is_custom ? "Custom prompt saved" : "Using default prompt");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save prompt");
    } finally {
      setPromptSaving(false);
    }
  }

  async function handleResetPrompt() {
    setPromptSaving(true);
    try {
      const res = await fetch("/api/profile/cv-analysis-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reset prompt");
      const next = data.prompt ?? data.default_prompt ?? "";
      setPrompt(next);
      setSavedPrompt(next);
      setDefaultPrompt(data.default_prompt ?? defaultPrompt);
      setIsCustomPrompt(false);
      toast.success("Prompt reset to default");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset prompt");
    } finally {
      setPromptSaving(false);
    }
  }

  const sortedRecommendations = analysis
    ? [...analysis.analysis.recommendations].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      )
    : [];

  const analyzeDisabled = analyzing || hasUnsavedCv || !hasSavedCv;
  const promptUnsaved = prompt !== savedPrompt;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              <Sparkles className="h-5 w-5" />
              Analyse ATS
            </CardTitle>
            <CardDescription className="text-base leading-7">
              Évaluation interne de lisibilité et de fit produit. Ce n’est pas une
              garantie de passage d’un ATS particulier.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="lg"
            onClick={onAnalyze}
            disabled={analyzeDisabled}
            variant={analysis?.is_stale ? "default" : "outline"}
            data-tour="guide-cv-analyze"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyse…" : analysis ? "Relancer l’analyse" : "Analyser le CV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="rounded-2xl border">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left text-base font-medium"
            onClick={() => setPromptOpen((open) => !open)}
          >
            <span className="flex items-center gap-2">
              Prompt d’analyse
              {isCustomPrompt ? (
                <Badge variant="secondary">Personnalisé</Badge>
              ) : (
                <Badge variant="outline">Par défaut</Badge>
              )}
            </span>
            {promptOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {promptOpen ? (
            <div className="space-y-4 border-t px-4 py-4">
              <Label htmlFor="cv-analysis-prompt" className="text-base">
                Prompt système utilisé pour l’analyse CV
              </Label>
              <Textarea
                id="cv-analysis-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                disabled={promptLoading || promptSaving}
                className="font-mono text-sm leading-6"
                placeholder={promptLoading ? "Chargement du prompt…" : "Prompt système…"}
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Conserve les champs JSON requis si tu modifies ce prompt. Le texte du CV
                est injecté séparément en message utilisateur.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={promptLoading || promptSaving || !prompt.trim() || !promptUnsaved}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {promptSaving ? "Enregistrement…" : "Enregistrer le prompt"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleResetPrompt}
                  disabled={promptLoading || promptSaving || (!isCustomPrompt && !promptUnsaved)}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {hasUnsavedCv && (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-base leading-7 text-amber-800">
            Enregistre ton contexte CV avant de lancer l’analyse.
          </p>
        )}

        {!hasSavedCv && !hasUnsavedCv && (
          <p className="text-base leading-7 text-muted-foreground">
            Ajoute et enregistre ton texte de CV pour activer l’analyse.
          </p>
        )}

        {loading ? (
          <p className="text-base text-muted-foreground">Chargement de l’analyse précédente…</p>
        ) : null}

        {analysis ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Dernière analyse :{" "}
                {new Date(analysis.analyzed_at).toLocaleString("fr-FR")}
              </span>
              {analysis.is_stale && (
                <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Obsolète — CV modifié depuis
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <ScoreCard label="Global" score={analysis.analysis.overall_score} />
              <ScoreCard label="Parsing" score={analysis.analysis.parsing_score} />
              <ScoreCard label="Structure" score={analysis.analysis.structure_score} />
              <ScoreCard label="Impact" score={analysis.analysis.impact_score} />
              <ScoreCard label="Mots-clés" score={analysis.analysis.keyword_score} />
            </div>

            <div className="rounded-2xl border bg-muted/30 p-6">
              <p className="text-base font-semibold">Synthèse recruteur</p>
              <p className="mt-2 text-base leading-7 text-muted-foreground">
                {analysis.analysis.recruiter_summary}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-base font-semibold">Rôles détectés</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.detected_roles.length > 0 ? (
                    analysis.analysis.detected_roles.map((role) => (
                      <Badge key={role} variant="outline" className="px-3 py-1 text-sm">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-base text-muted-foreground">Aucun détecté</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold">Expérience</p>
                <p className="text-base leading-7 text-muted-foreground">
                  {analysis.analysis.estimated_experience_years !== null
                    ? `${analysis.analysis.estimated_experience_years} ans (estimés depuis le CV)`
                    : "Non estimée depuis le CV"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-base font-semibold">Compétences</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.detected_skills.slice(0, 12).map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold">Outils</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.detected_tools.slice(0, 12).map((tool) => (
                    <Badge key={tool} variant="secondary" className="px-3 py-1 text-sm">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-base font-semibold">Langues</p>
                {analysis.analysis.detected_languages.length > 0 ? (
                  <ul className="space-y-2 text-base leading-7 text-muted-foreground">
                    {analysis.analysis.detected_languages.map((lang) => (
                      <li key={`${lang.language}-${lang.level ?? ""}`}>
                        • {lang.language}
                        {lang.level ? ` (${lang.level})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-base text-muted-foreground">Aucune détectée</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold">Secteurs</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.detected_industries.length > 0 ? (
                    analysis.analysis.detected_industries.map((industry) => (
                      <Badge key={industry} variant="outline" className="px-3 py-1 text-sm">
                        {industry}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-base text-muted-foreground">Aucun détecté</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-base font-semibold">Points forts</p>
                <BulletList items={analysis.analysis.strengths} emptyLabel="Aucun listé" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold">Points faibles</p>
                <BulletList items={analysis.analysis.weaknesses} emptyLabel="Aucun listé" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-base font-semibold">Mots-clés produit manquants</p>
              <div className="flex flex-wrap gap-2">
                {analysis.analysis.missing_product_keywords.length > 0 ? (
                  analysis.analysis.missing_product_keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-800"
                    >
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-base text-muted-foreground">Aucun signalé</span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-base font-semibold">Recommandations</p>
              {sortedRecommendations.length === 0 ? (
                <p className="text-base text-muted-foreground">Aucune recommandation.</p>
              ) : (
                <div className="space-y-4">
                  {sortedRecommendations.map((rec) => (
                    <div key={rec.id} className="space-y-2 rounded-2xl border p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold">{rec.title}</p>
                        <Badge variant="outline" className={severityBadgeClass(rec.severity)}>
                          {rec.severity}
                        </Badge>
                        <Badge variant="secondary">{rec.category}</Badge>
                      </div>
                      <p className="text-base leading-7 text-muted-foreground">{rec.explanation}</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        <span className="font-medium text-foreground">Preuve : </span>
                        {rec.evidence_from_cv}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        <span className="font-medium text-foreground">Suggestion : </span>
                        {rec.suggested_improvement}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          !loading &&
          hasSavedCv &&
          !hasUnsavedCv && (
            <p className="text-base leading-7 text-muted-foreground">
              Clique sur « Analyser le CV » pour obtenir scores et recommandations.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
