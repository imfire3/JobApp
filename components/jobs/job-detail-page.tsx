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
import { cn } from "@/lib/utils";
import type { CvAnalysisResponse, Job, JobStatus } from "@/types";
import { JOB_STATUSES } from "@/types";

const ATS_SUBSCORE_LABELS: Array<{
  key: "skills" | "keywords" | "experience" | "title" | "tools";
  label: string;
}> = [
  { key: "skills", label: "Compétences" },
  { key: "keywords", label: "Mots-clés" },
  { key: "experience", label: "Expérience" },
  { key: "title", label: "Titre" },
  { key: "tools", label: "Outils" },
];

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
  // Re-run only when no score and no persisted job-fit artifacts
  if (typeof job.match_score === "number") return false;
  if (job.job_posting_summary?.trim()) return false;
  if ((job.keywords_from_job?.length ?? 0) > 0) return false;
  if ((job.keywords_matched?.length ?? 0) > 0) return false;
  if ((job.keywords_missing?.length ?? 0) > 0) return false;
  return true;
}

function profileFitVerdict(score: number | null): {
  label: string;
  detail: string;
  tone: "good" | "partial" | "weak" | "pending";
} {
  if (typeof score !== "number") {
    return {
      label: "Analyse en cours ou à lancer",
      detail: "On compare ton CV à cette fiche pour estimer l’adéquation.",
      tone: "pending",
    };
  }
  if (score >= 70) {
    return {
      label: "Ton profil correspond bien à cette offre",
      detail: "Les missions et compétences visibles dans ton CV couvrent une bonne partie des attentes.",
      tone: "good",
    };
  }
  if (score >= 45) {
    return {
      label: "Correspondance partielle",
      detail: "Des points forts existent, mais des écarts ou mots-clés ATS manquent encore.",
      tone: "partial",
    };
  }
  return {
    label: "Écarts importants avec la fiche de poste",
    detail: "Le profil actuel ne couvre pas assez les exigences visibles de l’offre.",
    tone: "weak",
  };
}

function resolveJobKeywords(job: Job): string[] {
  if (job.keywords_from_job?.length) return job.keywords_from_job;
  return Array.from(
    new Set([...(job.keywords_matched ?? []), ...(job.keywords_missing ?? [])])
  );
}

function jobImportedDescription(job: Job): string {
  return (job.description || job.summary || "").trim();
}

function jobDescriptionPreview(job: Job, maxChars = 700): string {
  const text = jobImportedDescription(job);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
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
    return <p className="text-base text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge
          key={item}
          variant={tone === "missing" ? "outline" : "tag"}
          className={
            tone === "missing"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              : undefined
          }
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function AtsScoreBar({ value }: { value: number | null }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          typeof value !== "number"
            ? "bg-muted-foreground/20"
            : value >= 70
              ? "bg-emerald-500"
              : value >= 45
                ? "bg-amber-500"
                : "bg-orange-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-base text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5 text-base text-muted-foreground">
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
      const message =
        error instanceof Error ? error.message : "Analyse offre échouée";
      if (options?.silent) {
        setCvError(message);
        // Don't loop forever when CV is missing — surface the error instead
        const permanent =
          /cv|settings|candidat|unauthorized|401/i.test(message);
        if (!permanent) {
          autoJobAnalyzeStarted.current = false;
        }
      } else {
        toast.error(message);
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
      if (options?.silent) {
        autoCvAnalyzeStarted.current = false;
      } else {
        toast.error(message);
      }
    } finally {
      setCvAnalyzing(false);
    }
  }

  useEffect(() => {
    autoJobAnalyzeStarted.current = false;
    autoCvAnalyzeStarted.current = false;
  }, [jobId]);

  // Auto CV ATS analysis when missing or stale
  useEffect(() => {
    if (cvLoading || cvAnalyzing || autoCvAnalyzeStarted.current) return;
    if (cvAnalysis && !cvAnalysis.is_stale) return;
    autoCvAnalyzeStarted.current = true;
    void handleRunCvAnalysis({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto analysis per job visit
  }, [cvLoading, cvAnalysis, cvAnalyzing]);

  // Auto job-fit analysis when score/summary missing (needs saved CV text server-side)
  useEffect(() => {
    if (!job || loading || analyzing || autoJobAnalyzeStarted.current) return;
    if (!needsJobFitAnalysis(job)) return;
    autoJobAnalyzeStarted.current = true;
    void handleAnalyze({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot auto analysis per job
  }, [job?.id, job?.match_score, job?.job_posting_summary, loading, analyzing]);

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
        <div className="flex items-center gap-2 text-base text-muted-foreground">
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
          <p className="text-base text-muted-foreground">Offre introuvable.</p>
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
                <div className="flex flex-wrap gap-2 text-base text-muted-foreground">
                  <Badge variant="tag">{job.source}</Badge>
                  {job.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  ) : null}
                  {job.contract_type ? (
                    <Badge variant="tag">{job.contract_type}</Badge>
                  ) : null}
                  {job.salary ? <Badge variant="tag">{job.salary}</Badge> : null}
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
                  <p className="mt-1 text-base text-muted-foreground">
                    Résumé de l’offre, preuves trouvées dans ton CV pour ce poste,
                    et écarts / mots-clés à traiter. Les analyses se lancent
                    automatiquement.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAnalyze()}
                  disabled={analyzing}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {analyzing ? "Analyse…" : "Relancer l’analyse offre"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {analyzing && (
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse de l’offre en cours…
                  </div>
                )}

                {typeof job.match_score === "number" ? (
                  <p className={`text-2xl font-bold ${getMatchScoreColor(job.match_score)}`}>
                    Match {job.match_score}%
                  </p>
                ) : (
                  <p className="text-base text-muted-foreground">
                    Lance l’analyse de l’offre pour obtenir le score de match.
                  </p>
                )}

                {typeof job.ats_score === "number" || job.ats_breakdown ? (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-base font-medium text-muted-foreground">
                          Score ATS
                        </p>
                        {typeof job.ats_score === "number" ? (
                          <p
                            className={`text-3xl font-bold ${getMatchScoreColor(job.ats_score)}`}
                          >
                            {job.ats_score}%
                          </p>
                        ) : (
                          <p className="text-base text-muted-foreground">
                            Sous-scores disponibles — score global non calculable.
                          </p>
                        )}
                      </div>
                      <p className="max-w-md text-base text-muted-foreground">
                        Couverture compétences, mots-clés, expérience, titre et
                        outils entre ton CV et cette offre.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {ATS_SUBSCORE_LABELS.map(({ key, label }) => {
                        const value = job.ats_breakdown?.[key] ?? null;
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-base font-medium">{label}</p>
                              <p
                                className={cn(
                                  "text-base font-semibold tabular-nums",
                                  typeof value === "number"
                                    ? getMatchScoreColor(value)
                                    : "text-muted-foreground"
                                )}
                              >
                                {typeof value === "number" ? `${value}%` : "—"}
                              </p>
                            </div>
                            <AtsScoreBar value={value} />
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-base font-medium">
                          Mots-clés présents
                        </p>
                        <KeywordChips
                          items={job.keywords_matched}
                          emptyLabel="Aucun mot-clé commun détecté."
                          tone="matched"
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-base font-medium">
                          Mots-clés manquants
                        </p>
                        <KeywordChips
                          items={job.keywords_missing}
                          emptyLabel="Aucun mot-clé manquant listé."
                          tone="missing"
                        />
                      </div>
                    </div>
                  </div>
                ) : typeof job.match_score === "number" ? (
                  <p className="text-base text-muted-foreground">
                    Relance l’analyse de l’offre pour calculer le score ATS (compétences,
                    mots-clés, expérience, titre, outils).
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-base font-semibold">Offre importée</p>
                    {job.job_posting_summary ? (
                      <p className="text-base leading-relaxed text-foreground">
                        {job.job_posting_summary}
                      </p>
                    ) : (
                      <p className="text-base text-muted-foreground">
                        Résumé pas encore disponible — relance l’analyse de l’offre.
                      </p>
                    )}
                    {(job.skills?.length || job.tools?.length) ? (
                      <div className="space-y-2">
                        {job.skills?.length ? (
                          <div>
                            <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                              Compétences demandées
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 12).map((skill) => (
                                <Badge key={skill} variant="tag">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {job.tools?.length ? (
                          <div>
                            <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                              Outils demandés
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {job.tools.slice(0, 12).map((tool) => (
                                <Badge key={tool} variant="tag">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {resolveJobKeywords(job).length > 0 ? (
                      <div>
                        <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                          Mots-clés de l’offre
                        </p>
                        <KeywordChips
                          items={resolveJobKeywords(job).slice(0, 12)}
                          emptyLabel=""
                          tone="job"
                        />
                      </div>
                    ) : null}
                    {jobImportedDescription(job) ? (
                      <details className="rounded-lg border border-border/80 bg-background/80 p-3">
                        <summary className="cursor-pointer text-base font-medium text-muted-foreground">
                          Voir le texte importé brut
                        </summary>
                        <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                          {jobDescriptionPreview(job, 2000)}
                        </p>
                      </details>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-base font-semibold">Ton CV pour cette offre</p>
                    <p className="text-base text-muted-foreground">
                      Preuves issues du match avec <span className="font-medium text-foreground">{job.title}</span>
                      {" "}chez {job.company} — pas l’analyse ATS globale.
                    </p>
                    <div>
                      <p className="mb-1 text-base font-medium">Correspondances / overlaps</p>
                      <BulletList
                        items={job.match_reasons ?? []}
                        emptyLabel="Pas encore analysé pour cette offre."
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-base font-medium">Mots-clés déjà dans ton CV</p>
                      <KeywordChips
                        items={job.keywords_matched}
                        emptyLabel="Aucun mot-clé commun détecté."
                        tone="matched"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
                      À améliorer pour cette offre
                    </p>
                    <div>
                      <p className="mb-1 text-base font-medium">Écarts</p>
                      <BulletList
                        items={job.match_gaps ?? []}
                        emptyLabel="Aucun écart listé."
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-base font-medium">Mots-clés ATS à ajouter</p>
                      <KeywordChips
                        items={job.keywords_missing}
                        emptyLabel="Aucun mot-clé manquant listé."
                        tone="missing"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-base font-medium">Actions CV</p>
                      <BulletList
                        items={job.cv_improvements ?? []}
                        emptyLabel="Les améliorations apparaîtront après l’analyse."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cv" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Mon CV</CardTitle>
                  <p className="mt-1 text-base text-muted-foreground">
                    Ton profil à gauche, et en dessous les reformulations adaptées à
                    cette fiche de poste.
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
                    {cvAnalyzing ? "CV…" : "Relancer CV"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleAnalyze()}
                    disabled={analyzing}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {analyzing ? "Offre…" : "Relancer offre"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {(cvLoading || cvAnalyzing || analyzing) && (
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mise à jour des analyses…
                  </div>
                )}
                {cvError ? (
                  <p className="text-base text-destructive">
                    {cvError}{" "}
                    <Link href="/profile-ai" className="underline">
                      Vérifier le CV dans Profil & CV
                    </Link>
                  </p>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-base font-semibold">Profil & CV</p>
                      {typeof ats?.overall_score === "number" ? (
                        <Badge variant="secondary">
                          Score ATS {ats.overall_score}
                        </Badge>
                      ) : null}
                    </div>

                    {!ats && !cvLoading ? (
                      <p className="text-base text-muted-foreground">
                        Analyse CV absente. Importe ton CV dans{" "}
                    <Link href="/profile-ai" className="underline">
                      Profil & CV
                    </Link>
                        .
                      </p>
                    ) : null}

                    {ats?.detected_roles?.length ? (
                      <div>
                        <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                          Rôles
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ats.detected_roles.slice(0, 6).map((role) => (
                            <Badge key={role} variant="tag">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <p className="mb-2 text-base font-medium uppercase tracking-wide text-muted-foreground">
                        Expériences
                      </p>
                      {ats?.detected_experiences && ats.detected_experiences.length > 0 ? (
                        <ul className="space-y-3">
                          {ats.detected_experiences.slice(0, 6).map((exp, index) => {
                            const dates = [
                              [exp.start_month, exp.start_year].filter(Boolean).join("/"),
                              exp.is_current
                                ? "présent"
                                : [exp.end_month, exp.end_year].filter(Boolean).join("/"),
                            ]
                              .filter(Boolean)
                              .join(" → ");
                            return (
                              <li
                                key={`${exp.title}-${exp.organization}-${index}`}
                                className="rounded-lg border bg-background p-3"
                              >
                                <p className="text-base font-medium text-foreground">
                                  {exp.title}
                                </p>
                                <p className="text-base text-muted-foreground">
                                  {exp.organization}
                                  {dates ? ` · ${dates}` : ""}
                                </p>
                                {exp.highlights ? (
                                  <p className="mt-1 line-clamp-3 text-base leading-relaxed text-muted-foreground">
                                    {exp.highlights}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-base text-muted-foreground">
                          Aucune expérience structurée détectée pour l’instant.
                        </p>
                      )}
                    </div>

                    {ats?.detected_skills?.length ? (
                      <div>
                        <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                          Compétences
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ats.detected_skills.slice(0, 18).map((skill) => (
                            <Badge key={skill} variant="tag">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {ats?.detected_languages?.length ? (
                      <div>
                        <p className="mb-1 text-base font-medium uppercase tracking-wide text-muted-foreground">
                          Langues
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ats.detected_languages.slice(0, 8).map((lang) => (
                            <Badge key={lang.language} variant="tag">
                              {lang.language}
                              {lang.level ? ` · ${lang.level}` : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-base font-semibold">Pour cette offre</p>
                    <p className="text-base text-muted-foreground">
                      {job.title} · {job.company}
                    </p>
                    <div>
                      <p className="mb-1 text-base font-medium">Correspondances</p>
                      <BulletList
                        items={job.match_reasons ?? []}
                        emptyLabel="Pas encore analysé."
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-base font-medium">Mots-clés manquants</p>
                      <KeywordChips
                        items={job.keywords_missing}
                        emptyLabel="Aucun mot-clé manquant."
                        tone="missing"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div>
                    <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                      Améliorations de tournure (vs fiche de poste)
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      Reformulations concrètes pour aligner ton CV sur les attentes de
                      cette offre — sans inventer d’expérience.
                    </p>
                  </div>

                  {job.cv_improvement_items && job.cv_improvement_items.length > 0 ? (
                    <ul className="space-y-3">
                      {job.cv_improvement_items.map((item) => (
                        <li
                          key={item.id}
                          className="rounded-lg border border-border bg-background p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {item.cv_section ? (
                              <Badge variant="outline">{item.cv_section}</Badge>
                            ) : null}
                            <Badge
                              variant="secondary"
                              className={
                                item.priority === "high"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                                  : undefined
                              }
                            >
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="mt-2 text-base font-medium text-foreground">
                            {item.action}
                          </p>
                          {item.evidence_from_job ? (
                            <p className="mt-1 text-base text-muted-foreground">
                              Offre : {item.evidence_from_job}
                            </p>
                          ) : null}
                          {item.evidence_from_cv ? (
                            <p className="mt-1 text-base text-muted-foreground">
                              CV actuel : {item.evidence_from_cv}
                            </p>
                          ) : null}
                          {item.suggested_rewrite ? (
                            <p className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-base leading-relaxed text-emerald-900 dark:text-emerald-200">
                              Suggestion : {item.suggested_rewrite}
                            </p>
                          ) : null}
                          {item.information_to_confirm ? (
                            <p className="mt-1 text-base text-amber-700 dark:text-amber-300">
                              À confirmer : {item.information_to_confirm}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <BulletList
                      items={job.cv_improvements ?? []}
                      emptyLabel="Les reformulations apparaîtront après l’analyse de l’offre."
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiche" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Fiche de poste</CardTitle>
                  <p className="mt-1 text-base text-muted-foreground">
                    Est-ce que ton profil correspond à cette offre ? Si des écarts ou
                    problèmes ATS apparaissent, on propose des améliorations.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleAnalyze()}
                  disabled={analyzing}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {analyzing ? "Analyse…" : "Analyser le fit"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {analyzing ? (
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comparaison du CV avec la fiche de poste…
                  </div>
                ) : null}

                {(() => {
                  const verdict = profileFitVerdict(job.match_score);
                  const toneClass =
                    verdict.tone === "good"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : verdict.tone === "partial"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : verdict.tone === "weak"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border bg-muted/20";
                  return (
                    <div className={`space-y-3 rounded-xl border p-4 ${toneClass}`}>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
                            Verdict profil ↔ offre
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {verdict.label}
                          </p>
                          <p className="mt-1 text-base text-muted-foreground">{verdict.detail}</p>
                        </div>
                        {typeof job.match_score === "number" ? (
                          <p className={`text-3xl font-bold ${getMatchScoreColor(job.match_score)}`}>
                            {job.match_score}%
                          </p>
                        ) : (
                          <p className="text-base text-muted-foreground">Score n/a</p>
                        )}
                      </div>
                      {job.job_posting_summary ? (
                        <p className="text-base leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">Résumé de l’offre : </span>
                          {job.job_posting_summary}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-border p-4">
                    <p className="text-base font-semibold">Ce qui correspond</p>
                    <BulletList
                      items={job.match_reasons ?? []}
                      emptyLabel={
                        analyzing
                          ? "Analyse en cours…"
                          : "Pas encore de correspondances listées."
                      }
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
                      Écarts / risques ATS
                    </p>
                    <BulletList
                      items={[
                        ...(job.match_gaps ?? []),
                        ...(job.keywords_missing?.map(
                          (kw) => `Mot-clé ATS manquant dans le CV : ${kw}`
                        ) ?? []),
                      ]}
                      emptyLabel={
                        analyzing
                          ? "Analyse en cours…"
                          : "Aucun écart ATS listé pour l’instant."
                      }
                    />
                  </div>
                </div>

                {(job.cv_improvement_items?.length ||
                  job.cv_improvements?.length ||
                  job.keywords_missing?.length ||
                  job.match_gaps?.length) ? (
                  <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div>
                      <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                        Améliorations proposées
                      </p>
                      <p className="mt-1 text-base text-muted-foreground">
                        Suggestions pour mieux coller à cette fiche — uniquement si ton
                        expérience le permet vraiment.
                      </p>
                    </div>
                    {job.cv_improvement_items && job.cv_improvement_items.length > 0 ? (
                      <ul className="space-y-3">
                        {job.cv_improvement_items.map((item) => (
                          <li
                            key={item.id}
                            className="rounded-lg border border-border bg-background p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {item.cv_section ? (
                                <Badge variant="outline">{item.cv_section}</Badge>
                              ) : null}
                              <Badge variant="secondary">{item.priority}</Badge>
                            </div>
                            <p className="mt-2 text-base font-medium">{item.action}</p>
                            {item.suggested_rewrite ? (
                              <p className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2 text-base text-emerald-900 dark:text-emerald-200">
                                Suggestion : {item.suggested_rewrite}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <BulletList
                        items={job.cv_improvements ?? []}
                        emptyLabel="Aucune amélioration détaillée pour l’instant."
                      />
                    )}
                    {job.keywords_missing && job.keywords_missing.length > 0 ? (
                      <div>
                        <p className="mb-1 text-base font-medium">Mots-clés ATS à intégrer</p>
                        <KeywordChips
                          items={job.keywords_missing}
                          emptyLabel=""
                          tone="missing"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : typeof job.match_score === "number" && job.match_score >= 70 ? (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-base text-emerald-900 dark:text-emerald-200">
                    Bon fit : pas d’amélioration bloquante détectée pour cette offre.
                  </p>
                ) : null}

                <details className="rounded-lg border p-3">
                  <summary className="cursor-pointer text-base font-medium">
                    Voir le texte importé de l’offre
                  </summary>
                  {jobImportedDescription(job) ? (
                    <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                      {jobImportedDescription(job)}
                    </div>
                  ) : (
                    <p className="mt-3 text-base text-muted-foreground">
                      Aucune description enregistrée.
                    </p>
                  )}
                </details>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>3. Mots-clés en rapport</CardTitle>
                <p className="text-base text-muted-foreground">
                  Mots-clés extraits de cette fiche de poste, ceux déjà présents dans
                  ton CV, et ceux à ajouter pour cette candidature.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-base font-medium">Mots-clés de la fiche de poste</p>
                  <KeywordChips
                    items={resolveJobKeywords(job)}
                    emptyLabel="Relance l’analyse de l’offre pour extraire les mots-clés."
                    tone="job"
                  />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-base font-medium">Présents dans ton CV</p>
                  <KeywordChips
                    items={job.keywords_matched}
                    emptyLabel="Aucun mot-clé commun détecté pour l’instant."
                    tone="matched"
                  />
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-2 text-base font-medium">À ajouter / renforcer</p>
                  <KeywordChips
                    items={job.keywords_missing}
                    emptyLabel="Aucun mot-clé manquant listé."
                    tone="missing"
                  />
                  {job.keywords_missing && job.keywords_missing.length > 0 ? (
                    <p className="mt-3 text-base leading-6 text-muted-foreground">
                      Améliore ton CV en intégrant ces termes seulement s’ils
                      correspondent à ton expérience réelle :{" "}
                      <span className="font-medium text-foreground">
                        {job.keywords_missing.join(", ")}
                      </span>
                      .
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="improvements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>4. Améliorations de mon CV</CardTitle>
                <p className="text-base text-muted-foreground">
                  Suggestions concrètes pour cette offre uniquement. L’analyse ATS
                  globale reste dans l’onglet Mon CV.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-2 text-base font-medium">Pour cette offre</p>
                  <BulletList
                    items={job.cv_improvements ?? []}
                    emptyLabel="Les suggestions apparaîtront après l’analyse du poste."
                  />
                </div>
                {job.keywords_missing && job.keywords_missing.length > 0 ? (
                  <div>
                    <p className="mb-2 text-base font-medium">Mots-clés ATS manquants</p>
                    <KeywordChips
                      items={job.keywords_missing}
                      emptyLabel="Aucun."
                      tone="missing"
                    />
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
                    <p className="mt-1 text-base text-muted-foreground">{job.cover_letter_angle}</p>
                  ) : (
                    <p className="mt-1 text-base text-muted-foreground">
                      Prépare un premier brouillon à partir de ton CV et des besoins du poste.
                      Relis-le et ajuste-le avant de l’utiliser.
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
                  <p className="text-base text-muted-foreground">
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
