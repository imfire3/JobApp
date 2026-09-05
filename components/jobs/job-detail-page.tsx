"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Columns2,
  ExternalLink,
  FileText,
  FileUser,
  Loader2,
  MapPin,
  Sparkles,
  Tags,
  WandSparkles,
  type LucideIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CoverLetterModal } from "@/components/dashboard/cover-letter-modal";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { getMatchScoreColor, getStatusColor } from "@/lib/jobs/utils";
import type { CvAnalysisResponse, Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";

const ANALYSIS_TABS: Array<{
  value: string;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "comparatif", label: "Comparatif", icon: Columns2 },
  { value: "cv", label: "Mon CV", icon: FileUser },
  { value: "fiche", label: "Fiche de poste", icon: BriefcaseBusiness },
  { value: "keywords", label: "Mots-clés", icon: Tags },
  { value: "improvements", label: "Améliorations", icon: WandSparkles },
  { value: "cover", label: "Lettre", icon: FileText },
];

type JobDetailPageProps = {
  jobId: string;
};

function needsJobFitAnalysis(job: Job): boolean {
  return (
    typeof job.match_score !== "number" ||
    !job.job_posting_summary ||
    !job.keywords_from_job?.length ||
    !job.keywords_matched?.length ||
    !job.cv_improvements?.length
  );
}

function resolveJobKeywords(job: Job): string[] {
  if (job.keywords_from_job?.length) return job.keywords_from_job;
  return Array.from(
    new Set([...(job.keywords_matched ?? []), ...(job.keywords_missing ?? [])])
  );
}

function KeywordChips({
  items,
  emptyLabel,
  tone,
}: {
  items: string[] | null | undefined;
  emptyLabel: string;
  tone: "matched" | "missing" | "job";
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
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : tone === "missing"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : "border-border bg-muted/40 text-foreground"
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
  const autoJobAnalyzeStarted = useRef(false);
  const autoCvAnalyzeStarted = useRef(false);

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
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : "Analyse échouée");
      } else {
        setCvError(
          error instanceof Error ? error.message : "Analyse offre échouée"
        );
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleRunCvAnalysis(options?: { silent?: boolean }) {
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
      if (!options?.silent) toast.success("Analyse CV terminée");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyse CV échouée";
      setCvError(message);
      if (!options?.silent) toast.error(message);
    } finally {
      setCvAnalyzing(false);
    }
  }

  useEffect(() => {
    autoJobAnalyzeStarted.current = false;
    autoCvAnalyzeStarted.current = false;
  }, [jobId]);

  useEffect(() => {
    if (!job || analyzing || autoJobAnalyzeStarted.current) return;
    if (!needsJobFitAnalysis(job)) return;
    autoJobAnalyzeStarted.current = true;
    void handleAnalyze({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when job first needs fit analysis
  }, [job?.id, analyzing]);

  useEffect(() => {
    if (cvLoading || cvAnalyzing || autoCvAnalyzeStarted.current) return;
    if (cvAnalysis && !cvAnalysis.is_stale) return;
    autoCvAnalyzeStarted.current = true;
    void handleRunCvAnalysis({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when CV analysis missing/stale
  }, [cvLoading, cvAnalysis, cvAnalyzing]);

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
        cover_letter?: string;
        coverLetter?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Génération échouée");
      }
      if (payload.job) setJob(payload.job);
      else if (payload.cover_letter || payload.coverLetter) {
        const letter = payload.cover_letter ?? payload.coverLetter ?? null;
        setJob((prev) => (prev ? { ...prev, cover_letter: letter } : prev));
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
      <div className="mx-auto max-w-7xl">
        <Tabs defaultValue="comparatif" className="gap-4">
          <StickyPageHeader className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Link
                  href="/jobs"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Offres
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
                <PageHelpButton pageId="job-detail" />
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

            <TabsList aria-label="Analyses offre et CV" className="h-auto flex-wrap">
              {ANALYSIS_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </StickyPageHeader>

          <TabsContent value="comparatif" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Comparatif CV ↔ fiche de poste</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ce que dit l’offre, ce que dit ton CV, les écarts et les
                    améliorations à prioriser.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleRunCvAnalysis()}
                    disabled={cvAnalyzing || cvLoading}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {cvAnalyzing ? "CV…" : "Analyser CV"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleAnalyze()}
                    disabled={analyzing}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {analyzing ? "Offre…" : "Analyser offre"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(analyzing || cvLoading || cvAnalyzing) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour des analyses…
                  </div>
                )}

                {typeof job.match_score === "number" ? (
                  <p className={`text-2xl font-bold ${getMatchScoreColor(job.match_score)}`}>
                    Match {job.match_score}%
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Lance l’analyse de l’offre pour obtenir le score de match.
                  </p>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm font-semibold">Fiche de poste — ils disent / font</p>
                    {job.job_posting_summary ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {job.job_posting_summary}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Synthèse de l’offre pas encore disponible.
                      </p>
                    )}
                    {(job.skills?.length || job.tools?.length) ? (
                      <div className="space-y-2">
                        {job.skills?.length ? (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Compétences demandées
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 12).map((skill) => (
                                <Badge key={skill} variant="outline">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {job.tools?.length ? (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Outils demandés
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.tools.slice(0, 12).map((tool) => (
                                <Badge key={tool} variant="secondary">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-1 text-sm font-medium">Ce qu’ils attendent (overlaps)</p>
                      <BulletList
                        items={job.match_reasons ?? []}
                        emptyLabel="Pas encore analysé."
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-sm font-semibold">Ton CV — ce qui est marqué</p>
                    {ats?.recruiter_summary ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {ats.recruiter_summary}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Analyse CV absente — lance « Analyser CV » ou importe ton CV
                        dans{" "}
                        <Link href="/settings" className="underline">
                          Settings
                        </Link>
                        .
                      </p>
                    )}
                    {ats?.detected_skills?.length ? (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Compétences détectées
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ats.detected_skills.slice(0, 16).map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-1 text-sm font-medium">Points forts du CV</p>
                      <BulletList
                        items={ats?.strengths ?? []}
                        emptyLabel="Aucun point fort listé."
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      Incohérences / écarts
                    </p>
                    <BulletList
                      items={[
                        ...(job.match_gaps ?? []),
                        ...(job.keywords_missing?.map(
                          (kw) => `Mot-clé manquant dans le CV : ${kw}`
                        ) ?? []),
                        ...(ats?.weaknesses ?? []),
                      ]}
                      emptyLabel="Aucun écart listé pour l’instant."
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Améliorations à mettre
                    </p>
                    <BulletList
                      items={[
                        ...(job.cv_improvements ?? []),
                        ...(ats?.recommendations?.map((rec) => rec.suggested_improvement || rec.title) ??
                          []),
                      ]}
                      emptyLabel="Les améliorations apparaîtront après les analyses."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="space-y-4">
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
                  onClick={() => void handleRunCvAnalysis()}
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
                        {typeof ats.overall_score === "number" ? (
                          <p className={`text-3xl font-bold ${getMatchScoreColor(ats.overall_score)}`}>
                            {ats.overall_score}
                          </p>
                        ) : (
                          <p className="text-3xl font-bold text-muted-foreground">n/a</p>
                        )}
                      </div>
                      {[
                        ["Parsing", ats.parsing_score],
                        ["Structure", ats.structure_score],
                        ["Impact", ats.impact_score],
                        ["Keywords", ats.keyword_score],
                      ].map(([label, score]) => (
                        <div key={String(label)}>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <p className="text-lg font-semibold">
                            {typeof score === "number" ? score : "n/a"}
                          </p>
                        </div>
                      ))}
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
                          {ats.detected_skills.slice(0, 24).map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {ats.detected_tools?.length ? (
                      <div>
                        <p className="mb-2 text-sm font-medium">Outils détectés</p>
                        <div className="flex flex-wrap gap-2">
                          {ats.detected_tools.slice(0, 16).map((tool) => (
                            <Badge key={tool} variant="outline">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {ats.recommendations?.length ? (
                      <div>
                        <p className="mb-2 text-sm font-medium">Recommandations ATS</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {ats.recommendations.slice(0, 8).map((rec) => (
                            <li key={rec.id} className="rounded-lg border p-3">
                              <p className="font-medium text-foreground">{rec.title}</p>
                              {rec.explanation ? (
                                <p className="mt-1">{rec.explanation}</p>
                              ) : null}
                              {rec.suggested_improvement ? (
                                <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                                  → {rec.suggested_improvement}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiche" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3. Mots-clés en rapport</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Voici les mots-clés de la fiche de poste, ceux déjà présents dans ton
                  CV, et ceux à ajouter pour renforcer ta candidature.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-sm font-medium">Mots-clés de la fiche de poste</p>
                  <KeywordChips
                    items={resolveJobKeywords(job)}
                    emptyLabel="Relance l’analyse de l’offre pour extraire les mots-clés."
                    tone="job"
                  />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-sm font-medium">Présents dans ton CV</p>
                  <KeywordChips
                    items={job.keywords_matched}
                    emptyLabel="Aucun mot-clé commun détecté pour l’instant."
                    tone="matched"
                  />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-sm font-medium">À ajouter / renforcer</p>
                  <KeywordChips
                    items={job.keywords_missing}
                    emptyLabel="Aucun mot-clé manquant listé."
                    tone="missing"
                  />
                  {job.keywords_missing && job.keywords_missing.length > 0 ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Améliore ton CV en intégrant ces termes seulement s’ils
                      correspondent à ton expérience réelle :{" "}
                      <span className="font-medium text-foreground">
                        {job.keywords_missing.join(", ")}
                      </span>
                      .
                    </p>
                  ) : null}
                </div>
                {ats?.missing_product_keywords?.length ? (
                  <div className="lg:col-span-3 rounded-xl border border-border p-4">
                    <p className="mb-2 text-sm font-medium">
                      Mots-clés produit manquants (analyse CV)
                    </p>
                    <KeywordChips
                      items={ats.missing_product_keywords}
                      emptyLabel="Aucun."
                      tone="missing"
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="improvements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>4. Améliorations de mon CV</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Suggestions pour ce poste, plus les recommandations ATS du CV.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium">Pour cette offre</p>
                  <BulletList
                    items={job.cv_improvements ?? []}
                    emptyLabel="Les suggestions apparaîtront après l’analyse du poste."
                  />
                </div>
                {ats?.recommendations?.length ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">Recommandations ATS globales</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {ats.recommendations.map((rec) => (
                        <li key={rec.id} className="rounded-lg border p-3">
                          <p className="font-medium text-foreground">{rec.title}</p>
                          {rec.suggested_improvement ? (
                            <p className="mt-1">→ {rec.suggested_improvement}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cover" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Une lettre adaptée à cette offre</CardTitle>
                  {job.cover_letter_angle ? (
                    <p className="mt-1 text-sm text-muted-foreground">{job.cover_letter_angle}</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prépare un premier brouillon à partir de ton CV et des besoins du poste.
                      Relis-le et ajuste-le avant de l’utiliser.
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleGenerateCoverLetter}
                  disabled={generating}
                  data-tour="guide-cover-letter"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  {generating
                    ? "Génération…"
                    : job.cover_letter
                      ? "Régénérer"
                      : "Préparer ma lettre"}
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
          </TabsContent>
        </Tabs>
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
