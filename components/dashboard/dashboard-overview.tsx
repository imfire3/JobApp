"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  CircleHelp,
  MailCheck,
  Send,
} from "lucide-react";
import {
  DashboardKpiCards,
  type DashboardKpiItem,
} from "@/components/dashboard/dashboard-kpis";
import { DashboardRecommendation } from "@/components/dashboard/dashboard-recommendation";
import { DashboardProfileProgress } from "@/components/dashboard/dashboard-profile-progress";
import { DashboardTips } from "@/components/dashboard/dashboard-tips";
import {
  DashboardError,
  DashboardSkeleton,
} from "@/components/dashboard/dashboard-states";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import type {
  DashboardApplication,
  DashboardJob,
} from "@/lib/dashboard/overview";
import {
  buildDashboardTips,
  buildUpcomingDeadlines,
  computeDashboardStats,
  computeProfileProgress,
  formatEventDate,
  pickRecommendedJobs,
} from "@/lib/dashboard/overview";

type DashboardSummaryResponse = {
  jobs: DashboardJob[];
  applications: DashboardApplication[];
  first_name: string | null;
  profile: {
    hasCv: boolean;
    hasProfileReviewed: boolean;
    hasTargets: boolean;
  };
};

export function DashboardOverview() {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch("/api/dashboard/summary", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (
          !response.ok ||
          !payload ||
          !Array.isArray((payload as DashboardSummaryResponse).jobs) ||
          !Array.isArray((payload as DashboardSummaryResponse).applications)
        ) {
          throw new Error("dashboard");
        }
        return payload as DashboardSummaryResponse;
      })
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .catch(() => {
        if (!active || controller.signal.aborted) return;
        setData(null);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadToken]);

  const model = useMemo(() => {
    if (!data) return null;

    const stats = computeDashboardStats(data.jobs, data.applications);
    const profileProgress = computeProfileProgress(data.profile);
    const unscoredJobs = data.jobs.filter(
      (job) => job.match_score === null && job.status !== "archived"
    ).length;
    const nextInterview = buildUpcomingDeadlines(data.applications)[0] ?? null;

    return {
      stats,
      profileProgress,
      unscoredJobs,
      nextInterview,
      recommended: pickRecommendedJobs(data.jobs),
      tips: buildDashboardTips({
        jobs: data.jobs,
        applications: data.applications,
        profilePercent: profileProgress.percent,
      }),
    };
  }, [data]);

  function retry() {
    setLoading(true);
    setError(false);
    setReloadToken((value) => value + 1);
  }

  const firstName = data?.first_name?.trim();

  const kpiItems: DashboardKpiItem[] = model
    ? [
        {
          id: "offers",
          label: "Offres enregistrées",
          value: String(model.stats.offers),
          hint:
            model.stats.offers === 0
              ? "Ajoute ta première offre"
              : model.unscoredJobs > 0
                ? `${model.unscoredJobs} à comparer à ton CV`
                : "Toutes comparées à ton CV",
          icon: Briefcase,
          href: "/jobs",
        },
        {
          id: "applications-sent",
          label: "Candidatures envoyées",
          value: String(model.stats.applicationsSent),
          hint:
            model.stats.applicationsSent === 0
              ? "Marque une offre comme envoyée"
              : model.stats.activeApplications > 0
                ? `${model.stats.activeApplications} en cours dans ton suivi`
                : "Aucune démarche en cours",
          icon: Send,
          href: "/applications",
        },
        {
          id: "interviews",
          label: "Entretiens",
          value: String(model.stats.interviews),
          hint: model.nextInterview
            ? `Prochain : ${formatEventDate(model.nextInterview.date)}`
            : "Aucun entretien programmé",
          icon: CalendarClock,
          href: "/applications",
        },
        {
          id: "responses",
          label: "Réponses reçues",
          value: String(model.stats.responses),
          hint:
            model.stats.applicationsSent === 0
              ? "Après tes premiers envois"
              : model.stats.responseRate === null
                ? "Réponses enregistrées"
                : `${model.stats.responseRate} % de taux de réponse`,
          icon: MailCheck,
          href: "/applications",
        },
      ]
    : [];

  return (
    <div className="-m-4 min-h-full space-y-6 bg-app-canvas p-4 pb-8 md:-m-6 md:p-6 md:pb-10 lg:-mx-12 lg:-mt-8 lg:px-12 lg:pt-8 lg:pb-12 xl:-mx-16 xl:px-16">
      <header className="flex items-center gap-8 border-b border-app-border-strong pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-10 text-app-text">
            {firstName ? `Bonjour ${firstName} 👋` : "Bonjour 👋"}
          </h1>
          <p className="text-sm leading-5 tracking-[-0.017em] text-app-text-label">
            Voici l’essentiel de ta recherche d’emploi.
          </p>
        </div>
        <PageHelpButton
          pageId="dashboard"
          label="Aide sur le tableau de bord"
          trigger={(openHelp) => (
            <button
              type="button"
              onClick={openHelp}
              aria-label="Aide sur le tableau de bord"
              className="flex size-(--app-control-height) shrink-0 items-center justify-center rounded-app-surface border-(length:--app-stroke) border-app-border-default bg-app-surface text-app-text transition-colors hover:border-app-text-secondary hover:bg-app-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas"
            >
              <CircleHelp className="size-6" aria-hidden />
            </button>
          )}
        />
      </header>

      {loading && !model ? (
        <DashboardSkeleton />
      ) : error && !model ? (
        <DashboardError onRetry={retry} />
      ) : model ? (
        <>
          <DashboardTips tips={model.tips} />

          <DashboardKpiCards items={kpiItems} />

          <div className="grid gap-4 xl:h-[370px] xl:grid-cols-[minmax(0,3.075fr)_minmax(0,1fr)]">
            <DashboardRecommendation jobs={model.recommended} />
            <DashboardProfileProgress progress={model.profileProgress} />
          </div>
        </>
      ) : null}
    </div>
  );
}
