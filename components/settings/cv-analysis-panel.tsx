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
  if (severity === "medium") return "border-[#FFB900]/30 bg-[#FFB900]/10 text-[#FFB900]";
  return "bg-muted text-muted-foreground";
}

function ScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-[#383838] bg-[#212121] p-4 text-center" style={{ minHeight: 102 }}>
      <p className="text-sm font-medium uppercase tracking-wide text-[#A1A1A1]">{label}</p>
      {typeof score === "number" ? (
        <p className={`mt-2 text-[30px] font-semibold leading-none ${getMatchScoreColor(score)}`}>{score}</p>
      ) : (
        <p className="mt-2 text-[30px] font-semibold leading-none text-[#A1A1A1]">n/a</p>
      )}
    </div>
  )
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold text-[#FAFAFA]">{label}</p>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-lg font-semibold text-[#FAFAFA]">{children}</p>
}

function ResultBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#383838] bg-[#212121] p-4 text-base leading-7 text-[#FAFAFA]">
      {children}
    </div>
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
    <Card className="rounded-[18px] border border-[#383838] bg-[#171717]">
      <CardHeader className="px-6 pb-0 pt-0">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold text-[#FAFAFA]">
            <Sparkles className="h-5 w-5" />
            Analyse ATS
          </CardTitle>
          {analysis ? (
            <span className="text-sm text-[#A1A1A1]">
              Dernière analyse : {new Date(analysis.analyzed_at).toLocaleString("fr-FR")}
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <CardDescription className="text-sm leading-6 text-[#A1A1A1]">
            Évaluation interne de lisibilité et de fit produit. Ce n&apos;est pas une
            garantie de passage d&apos;un ATS particulier.
          </CardDescription>
          <Button
            type="button"
            size="lg"
            onClick={onAnalyze}
            disabled={analyzeDisabled}
            variant={analysis?.is_stale ? "default" : "outline"}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            {analyzing ? "Analyse…" : analysis ? "Relancer l'analyse" : "Analyser le CV"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {hasUnsavedCv && (
          <p className="rounded-[10px] border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-700">
            Enregistre ton contexte CV avant de lancer l&apos;analyse.
          </p>
        )}

        {!hasSavedCv && !hasUnsavedCv && (
          <p className="text-sm leading-6 text-[#A1A1A1]">
            Ajoute et enregistre ton texte de CV pour activer l&apos;analyse.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[#A1A1A1]">Chargement de l&apos;analyse précédente…</p>
        ) : null}

        {analysis ? (
          <>
            {analysis.is_stale && (
              <div className="flex items-center gap-2 text-sm text-[#A1A1A1]">
                <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Obsolète — CV modifié depuis
                </Badge>
              </div>
            )}

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <ScoreCard label="Global" score={analysis.analysis.overall_score} />
              <ScoreCard label="Parsing" score={analysis.analysis.parsing_score} />
              <ScoreCard label="Structure" score={analysis.analysis.structure_score} />
              <ScoreCard label="Impact" score={analysis.analysis.impact_score} />
              <ScoreCard label="Mots-clés" score={analysis.analysis.keyword_score} />
            </div>

            {/* Synthèse recruteur */}
            <div className="space-y-3">
              <SectionTitle>Synthèse recruteur</SectionTitle>
              <ResultBox>{analysis.analysis.recruiter_summary}</ResultBox>
            </div>

            {/* Informations extraites */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <InfoCard label="Rôles détectés">
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis.detected_roles.length > 0 ? (
                      analysis.analysis.detected_roles.map((role) => (
                        <Badge key={role} variant="tag">{role}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-[#A1A1A1]">Aucun détecté</span>
                    )}
                  </div>
                </InfoCard>
                <InfoCard label="Compétences">
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis.detected_skills.slice(0, 12).map((skill) => (
                      <Badge key={skill} variant="tag">{skill}</Badge>
                    ))}
                  </div>
                </InfoCard>
                <InfoCard label="Secteurs">
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis.detected_industries.length > 0 ? (
                      analysis.analysis.detected_industries.map((industry) => (
                        <Badge key={industry} variant="tag">{industry}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-[#A1A1A1]">Aucun détecté</span>
                    )}
                  </div>
                </InfoCard>
              </div>
              <div className="space-y-4">
                <InfoCard label="Expérience">
                  <Badge variant="tag">
                    {analysis.analysis.estimated_experience_years !== null
                      ? `${analysis.analysis.estimated_experience_years} ans (estimés depuis le CV)`
                      : "Non estimée depuis le CV"}
                  </Badge>
                </InfoCard>
                <InfoCard label="Outils">
                  <div className="flex flex-wrap gap-2">
                    {analysis.analysis.detected_tools.slice(0, 12).map((tool) => (
                      <Badge key={tool} variant="tag">{tool}</Badge>
                    ))}
                  </div>
                </InfoCard>
              </div>
            </div>

            {/* Points forts / Points faibles */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <SectionTitle>Points forts</SectionTitle>
                {analysis.analysis.strengths.length === 0 ? (
                  <p className="text-sm text-[#A1A1A1]">Aucun listé</p>
                ) : (
                  <div className="space-y-2">
                    {analysis.analysis.strengths.map((item, index) => (
                      <ResultBox key={`strength-${index}`}>{item}</ResultBox>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <SectionTitle>Points faibles</SectionTitle>
                {analysis.analysis.weaknesses.length === 0 ? (
                  <p className="text-sm text-[#A1A1A1]">Aucun listé</p>
                ) : (
                  <div className="space-y-2">
                    {analysis.analysis.weaknesses.map((item, index) => (
                      <div key={`weakness-${index}`} className="rounded-[10px] border border-[#383838] bg-[#212121] p-4 text-sm leading-6 text-[#FFB900]">
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommandations */}
            <div className="space-y-4">
              <SectionTitle>Recommandations</SectionTitle>
              {sortedRecommendations.length === 0 ? (
                <p className="text-sm text-[#A1A1A1]">Aucune recommandation.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {sortedRecommendations.map((rec) => (
                    <div key={rec.id} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-[#FAFAFA]">{rec.title}</p>
                        <Badge variant="outline" className={`shrink-0 text-xs ${severityBadgeClass(rec.severity)}`}>
                          {rec.severity}
                        </Badge>
                      </div>
                      <div className="space-y-2 rounded-[10px] border border-[#383838] bg-[#212121] p-4">
                        <ResultBox>{rec.explanation}</ResultBox>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-[#A1A1A1]">Preuve</p>
                          <ResultBox>{rec.evidence_from_cv}</ResultBox>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-[#A1A1A1]">Suggestion</p>
                          <ResultBox>{rec.suggested_improvement}</ResultBox>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mots-clés produit manquants */}
            <div className="space-y-3">
              <SectionTitle>Mots-clés produit manquants</SectionTitle>
              {analysis.analysis.missing_product_keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.missing_product_keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-700"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#A1A1A1]">Aucun signalé</p>
              )}
            </div>
          </>
        ) : (
          !loading &&
          hasSavedCv &&
          !hasUnsavedCv && (
            <p className="text-sm leading-6 text-[#A1A1A1]">
              Clique sur « Analyser le CV » pour obtenir scores et recommandations.
            </p>
          )
        )}

        {/* Prompt d'analyse — toujours en dernier */}
        <div className="rounded-[10px] border border-[#383838] bg-[#212121]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[#FAFAFA]"
            onClick={() => setPromptOpen((open) => !open)}
          >
            <span className="flex items-center gap-2">
              Prompt d&apos;analyse
              {isCustomPrompt ? (
                <Badge variant="secondary" className="text-xs">Personnalisé</Badge>
              ) : (
                <Badge variant="outline" className="border-[#383838] text-xs text-[#A1A1A1]">Par défaut</Badge>
              )}
            </span>
            {promptOpen ? (
              <ChevronUp className="h-4 w-4 text-[#A1A1A1]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#A1A1A1]" />
            )}
          </button>
          {promptOpen ? (
            <div className="space-y-4 border-t border-[#383838] px-4 py-4">
              <Label htmlFor="cv-analysis-prompt" className="text-sm text-[#A1A1A1]">
                Prompt système utilisé pour l&apos;analyse CV
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
              <p className="text-xs leading-5 text-[#A1A1A1]">
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
      </CardContent>
    </Card>
  );
}
