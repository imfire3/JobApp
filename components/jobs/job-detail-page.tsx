"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { getMatchScoreColor, getStatusColor } from "@/lib/jobs/utils";
import type { CvAnalysisResponse, Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";

type JobDetailPageProps = {
  jobId: string;
};

function needsJobFitAnalysis(job: Job): boolean {
  return (
    typeof job.match_score !== "number" ||
    !job.job_posting_summary ||
    !job.keywords_matched?.length ||
    !job.cv_improvements?.length
  );
}

function KeywordChips({
  items,
  emptyLabel,
  tone,
}: {
  items: string[] | null | undefined;
  emptyLabel: string;
  tone: "matched" | "missing";
}) {
  if (!items?.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className={
            tone === "matched"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
              : "border-amber-500/30 bg-amber-500/10 text-amber-800"
          }
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>• {item}</li>
      ))}
    </ul>
  );
}

export function JobDetailPage({ jobId }: JobDetailPageProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvAnalyzing, setCvAnalyzing] = useState(false);
  const [cvAnalysis, setCvAnalysis] = useState<CvAnalysisResponse | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const autoAnalyzeStarted = useRef(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const payload = (await res.json()) as { job?: Job; error?: string };
      if (!res.ok || !payload.job) {
        throw new Error(payload.error ?? "Job introuvable");
      }
      setJob(payload.job);
      return payload.job;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement échoué");
      setJob(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const loadCvAnalysis = useCallback(async () => {
    setCvLoading(true);
    setCvError(null);
    try {
      const res = await fetch("/api/profile/analyze-cv");
      const payload = (await res.json()) as {
        analysis?: CvAnalysisResponse | null;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Impossible de charger l’analyse CV");
      }
      setCvAnalysis(payload.analysis ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de charger l’analyse CV";
      setCvError(message);
      setCvAnalysis(null);
    } finally {
      setCvLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJob();
    void loadCvAnalysis();
  }, [loadJob, loadCvAnalysis]);

  async function updateJob(updates: Partial<Pick<Job, "status" | "selected" | "cover_letter">>) {
    if (!job) return;
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, ...updates }),
    });
    const payload = (await res.json()) as { job?: Job; error?: string };
    if (!res.ok || !payload.job) {
      toast.error(payload.error ?? "Mise à jour échouée");
      return;
    }
    setJob(payload.job);
  }

  async function handleAnalyze(options?: { silent?: boolean }) {
    if (!job) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const payload = (await res.json()) as { job?: Job; error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Analyse échouée");
      }
      if (payload.job) setJob(payload.job);
      else await loadJob();
      if (!options?.silent) toast.success("Analyse terminée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse échouée");
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    if (!job || analyzing || autoAnalyzeStarted.current) return;
    if (!needsJobFitAnalysis(job)) return;
    autoAnalyzeStarted.current = true;
    void handleAnalyze({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when job first needs fit analysis
  }, [job?.id, analyzing]);

  async function handleRunCvAnalysis() {
    setCvAnalyzing(true);
    setCvError(null);
    try {
      const res = await fetch("/api/profile/analyze-cv", { method: "POST" });
      const payload = (await res.json()) as {
        analysis?: CvAnalysisResponse;
        error?: string;
      };
      if (!res.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Analyse CV échouée");
      }
      setCvAnalysis(payload.analysis);
      toast.success("Analyse CV terminée");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse CV échouée";
      setCvError(message);
      toast.error(message);
    } finally {
      setCvAnalyzing(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!job) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const payload = (await res.json()) as {
        job?: Job;
        coverLetter?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Génération échouée");
      }
      if (payload.job) setJob(payload.job);
      else if (payload.coverLetter) {
        setJob((prev) =>
          prev ? { ...prev, cover_letter: payload.coverLetter ?? null } : prev
        );
      } else {
        await loadJob();
      }
      setCoverOpen(true);
      toast.success("Lettre générée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Génération échouée");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l’offre…
        </div>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Offre introuvable.</p>
          <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux jobs
          </Link>
        </div>
      </AppShell>
    );
  }

  const ats = cvAnalysis?.analysis;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Link
              href="/jobs"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Jobs
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <p className="text-muted-foreground">{job.company}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{job.source}</Badge>
              {job.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              ) : null}
              {job.contract_type ? (
                <Badge variant="outline">{job.contract_type}</Badge>
              ) : null}
              {job.salary ? <Badge variant="outline">{job.salary}</Badge> : null}
              <Badge className={getStatusColor(job.status)} variant="secondary">
                {job.status.replace(/_/g, " ")}
              </Badge>
              {typeof job.match_score === "number" ? (
                <span className={`font-bold ${getMatchScoreColor(job.match_score)}`}>
                  Match {job.match_score}%
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Offre source
            </a>
            <Select
              value={job.status}
              onValueChange={(value) => {
                if (!value) return;
                void updateJob({ status: value as JobStatus });
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>1. Analyse de mon CV</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Synthèse ATS de ton profil (indépendante du poste).
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunCvAnalysis}
              disabled={cvAnalyzing || cvLoading}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {cvAnalyzing ? "Analyse…" : ats ? "Relancer" : "Analyser le CV"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {cvLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement de l’analyse CV…
              </div>
            ) : null}
            {cvError ? (
              <p className="text-sm text-destructive">
                {cvError}{" "}
                <Link href="/settings" className="underline">
                  Vérifier le CV dans Settings
                </Link>
              </p>
            ) : null}
            {!cvLoading && !cvError && !ats ? (
              <p className="text-sm text-muted-foreground">
                Aucune analyse CV enregistrée. Lance une analyse ou importe ton CV dans{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                .
              </p>
            ) : null}
            {ats ? (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Score global
                    </p>
                    <p className={`text-3xl font-bold ${getMatchScoreColor(ats.overall_score)}`}>
                      {ats.overall_score}
                    </p>
                  </div>
                  {cvAnalysis?.is_stale ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                      CV modifié depuis cette analyse
                    </Badge>
                  ) : null}
                </div>
                {ats.recruiter_summary ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {ats.recruiter_summary}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm font-medium">Points forts</p>
                    <BulletList items={ats.strengths} emptyLabel="Aucun point fort listé." />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">Faiblesses</p>
                    <BulletList items={ats.weaknesses} emptyLabel="Aucune faiblesse listée." />
                  </div>
                </div>
                {ats.detected_skills?.length ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Compétences détectées</p>
                    <div className="flex flex-wrap gap-2">
                      {ats.detected_skills.slice(0, 16).map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>2. Analyse de la fiche de poste</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Synthèse du poste et fit avec ton CV.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {analyzing ? "Analyse…" : "Relancer"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyzing && needsJobFitAnalysis(job) ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse du poste en cours…
              </div>
            ) : null}
            {typeof job.match_score === "number" ? (
              <p className={`text-2xl font-bold ${getMatchScoreColor(job.match_score)}`}>
                {job.match_score}% match
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Pas encore de score de match.</p>
            )}
            {job.job_posting_summary ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {job.job_posting_summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                La synthèse de la fiche apparaîtra après l’analyse.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium">Points forts / overlaps</p>
                <BulletList
                  items={job.match_reasons ?? []}
                  emptyLabel="Pas encore analysé."
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium">Gaps</p>
                <BulletList items={job.match_gaps ?? []} emptyLabel="Pas encore analysé." />
              </div>
            </div>
            {job.description || job.summary ? (
              <details className="rounded-lg border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Voir la description complète
                </summary>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {job.description || job.summary}
                </div>
              </details>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Mots-clés en rapport</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chevauchement entre ton CV et les exigences du poste.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Présents dans le CV</p>
              <KeywordChips
                items={job.keywords_matched}
                emptyLabel="Aucun mot-clé commun pour l’instant."
                tone="matched"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Manquants / à renforcer</p>
              <KeywordChips
                items={job.keywords_missing}
                emptyLabel="Aucun mot-clé manquant listé."
                tone="missing"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Améliorations de mon CV</CardTitle>
            <p className="text-sm text-muted-foreground">
              Suggestions concrètes pour ce poste (sans inventer d’expérience).
            </p>
          </CardHeader>
          <CardContent>
            <BulletList
              items={job.cv_improvements ?? []}
              emptyLabel="Les suggestions apparaîtront après l’analyse du poste."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>5. Générer une cover letter</CardTitle>
              {job.cover_letter_angle ? (
                <p className="mt-1 text-sm text-muted-foreground">{job.cover_letter_angle}</p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Génère une lettre personnalisée à partir du CV et de cette offre.
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleGenerateCoverLetter}
              disabled={generating}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              {generating
                ? "Génération…"
                : job.cover_letter
                  ? "Régénérer"
                  : "Générer"}
            </Button>
          </CardHeader>
          <CardContent>
            {job.cover_letter ? (
              <Textarea
                value={job.cover_letter}
                onChange={(e) =>
                  setJob((prev) =>
                    prev ? { ...prev, cover_letter: e.target.value } : prev
                  )
                }
                onBlur={() => {
                  if (job.cover_letter) void updateJob({ cover_letter: job.cover_letter });
                }}
                className="min-h-48"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune lettre pour l’instant. Clique « Générer » pour en créer une.
              </p>
            )}
            {job.cover_letter ? (
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => setCoverOpen(true)}
              >
                Ouvrir en grand
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <CoverLetterModal
        job={coverOpen ? job : null}
        open={coverOpen}
        onOpenChange={setCoverOpen}
        onSave={async (_id, coverLetter) => {
          await updateJob({ cover_letter: coverLetter });
        }}
        onRegenerate={handleGenerateCoverLetter}
        isRegenerating={generating}
      />
    </AppShell>
  );
}
