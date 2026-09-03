"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ImportCardStatus =
  | "preview"
  | "queued"
  | "analyzing"
  | "done"
  | "error";

export type ImportJobCard = {
  key: string;
  id?: string;
  title: string;
  company: string;
  location?: string | null;
  url: string;
  status: ImportCardStatus;
  matchScore?: number | null;
  error?: string | null;
  /** 0–100 progress for this card */
  progress?: number;
};

type ImportAnalysisPanelProps = {
  cards: ImportJobCard[];
  analyzing: boolean;
  analyzedCount: number;
  totalCount: number;
  progressPercent: number;
  canValidate: boolean;
};

function cardProgress(card: ImportJobCard): number {
  if (typeof card.progress === "number") return Math.max(0, Math.min(100, card.progress));
  if (card.status === "done" || card.status === "error") return 100;
  if (card.status === "analyzing") return 55;
  if (card.status === "queued") return 5;
  return 0;
}

function cardProgressLabel(card: ImportJobCard): string {
  if (card.status === "analyzing") return "Analyse IA…";
  if (card.status === "queued") return "En file d’attente…";
  if (card.status === "done") {
    return typeof card.matchScore === "number"
      ? `Analyse OK — match ${card.matchScore}%`
      : "Analyse OK";
  }
  if (card.status === "error") return card.error || "Échec analyse";
  return "Prêt à analyser";
}

export function ImportAnalysisPanel({
  cards,
  analyzing,
  analyzedCount,
  totalCount,
  progressPercent,
  canValidate,
}: ImportAnalysisPanelProps) {
  if (cards.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Analyse des offres
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {analyzing
            ? `Analyse en cours… ${analyzedCount}/${totalCount} · global ${progressPercent}%`
            : canValidate
              ? `Analyse terminée (${analyzedCount}/${totalCount})`
              : `${totalCount} offre(s) prêtes — clique « Importer et analyser »`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const pct = cardProgress(card);
            const showBar = card.status !== "preview" || analyzing;

            return (
              <article
                key={card.key}
                className="flex flex-col rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold leading-tight">
                      {card.title || "Sans titre"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {card.company || "—"}
                      {card.location ? ` · ${card.location}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={card.status} score={card.matchScore} />
                </div>

                {showBar ? (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {card.status === "analyzing" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {cardProgressLabel(card)}
                      </span>
                      <span className="font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full border bg-muted"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-label={`Progression analyse ${card.title}`}
                    >
                      <div
                        className={`h-full rounded-full bg-primary transition-[width] duration-300 ${
                          card.status === "analyzing" ? "animate-pulse" : ""
                        } ${card.status === "error" ? "bg-destructive" : ""}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-muted-foreground">
                    En aperçu — lance l’import pour analyser
                  </p>
                )}

                {card.status === "error" && card.error ? (
                  <p className="mb-3 text-xs text-destructive">{card.error}</p>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Voir
                  </a>
                  {typeof card.matchScore === "number" ? (
                    <span className="text-sm font-bold">{card.matchScore}%</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {canValidate ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="flex-1 text-sm">
              Analyse terminée. Valide pour ouvrir le board Jobs.
            </p>
            <Link href="/jobs" className={buttonVariants()}>
              Valider et voir les jobs
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
  score,
}: {
  status: ImportCardStatus;
  score?: number | null;
}) {
  if (status === "done") {
    return (
      <Badge variant="secondary" className="shrink-0">
        {typeof score === "number" ? `${score}%` : "OK"}
      </Badge>
    );
  }
  if (status === "analyzing") {
    return (
      <Badge variant="outline" className="shrink-0">
        Analyse…
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="shrink-0 gap-1">
        <XCircle className="h-3 w-3" />
        Erreur
      </Badge>
    );
  }
  if (status === "queued") {
    return (
      <Badge variant="outline" className="shrink-0">
        En file
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0">
      Aperçu
    </Badge>
  );
}
