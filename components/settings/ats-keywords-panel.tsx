"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMatchScoreColor } from "@/lib/jobs/utils";
import type { CvAnalysisResponse } from "@/types";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function KeywordGroup({
  title,
  items,
  emptyLabel,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  tone?: "neutral" | "missing" | "strong";
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge
              key={item}
              variant={tone === "neutral" ? "secondary" : "outline"}
              className={
                tone === "missing"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                  : tone === "strong"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : undefined
              }
            >
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function AtsKeywordsPanel() {
  const [analysis, setAnalysis] = useState<CvAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/analyze-cv");
      const data = (await res.json()) as {
        analysis?: CvAnalysisResponse | null;
        error?: string;
      };
      if (!res.ok) {
        setAnalysis(null);
        return;
      }
      setAnalysis(data.analysis ?? null);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" });
      const data = (await res.json()) as {
        analysis?: CvAnalysisResponse;
        error?: string;
      };
      if (!res.ok || !data.analysis) {
        throw new Error(data.error ?? "Analyse CV échouée");
      }
      setAnalysis(data.analysis);
      toast.success("Mots-clés ATS mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse CV échouée");
    } finally {
      setAnalyzing(false);
    }
  }

  const ats = analysis?.analysis;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Mots-clés ATS</CardTitle>
          <CardDescription>
            Compétences, outils et mots-clés produit détectés sur ton CV (et ceux manquants).
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing || loading}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyse…" : "Rafraîchir"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : null}

        {!loading && !ats ? (
          <p className="text-sm text-muted-foreground">
            Aucune analyse CV.{" "}
            <Link href="/profile-ai" className={buttonVariants({ variant: "link", className: "h-auto p-0" })}>
              Ajoute ton CV dans CV Context
            </Link>{" "}
            puis lance une analyse.
          </p>
        ) : null}

        {ats ? (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Score keywords
                </p>
                <p className={`text-2xl font-bold ${getMatchScoreColor(ats.keyword_score)}`}>
                  {ats.keyword_score}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall</p>
                <p className={`text-2xl font-bold ${getMatchScoreColor(ats.overall_score)}`}>
                  {ats.overall_score}
                </p>
              </div>
              {analysis?.is_stale ? (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                  CV modifié depuis cette analyse
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <KeywordGroup
                title="Compétences détectées"
                items={ats.detected_skills}
                emptyLabel="Aucune compétence détectée"
                tone="strong"
              />
              <KeywordGroup
                title="Outils détectés"
                items={ats.detected_tools}
                emptyLabel="Aucun outil détecté"
              />
              <KeywordGroup
                title="Rôles détectés"
                items={ats.detected_roles}
                emptyLabel="Aucun rôle détecté"
              />
              <KeywordGroup
                title="Industries"
                items={ats.detected_industries}
                emptyLabel="Aucune industrie détectée"
              />
            </div>

            <KeywordGroup
              title="Mots-clés produit manquants"
              items={ats.missing_product_keywords}
              emptyLabel="Aucun mot-clé manquant signalé"
              tone="missing"
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
