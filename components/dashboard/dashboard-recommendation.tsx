import Link from "next/link";
import {
  Building2,
  Plus,
  Sparkles,
} from "lucide-react";
import type { DashboardJob } from "@/lib/dashboard/overview";
import {
  DashboardInset,
  DashboardSectionHeader,
  DashboardSurface,
  dashboardBadgeClassName,
  dashboardCtaClassName,
} from "@/components/dashboard/dashboard-surface";
import { cn } from "@/lib/utils";

export function DashboardRecommendation({
  jobs,
  className,
}: {
  jobs: DashboardJob[];
  className?: string;
}) {
  return (
    <DashboardSurface className={cn("h-full min-w-0 @container", className)}>
      <DashboardSectionHeader
        icon={Sparkles}
        title="Recommandé pour toi"
        description={
          jobs.length > 0
            ? "L’offre avec le meilleur potentiel dans ta sélection."
            : "Retrouve ici les offres qui correspondent à ton profil."
        }
      />
      {jobs.length > 0 ? (
        <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-2 @lg:grid-cols-3">
          {jobs.map((job) => (
            <RecommendedJob key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <RecommendationEmptyState />
      )}
    </DashboardSurface>
  );
}

function RecommendedJob({ job }: { job: DashboardJob }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "flex h-full min-w-0 flex-col gap-4 rounded-app-surface border border-app-border bg-app-surface p-4 transition-colors hover:border-app-border-strong hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 min-w-0 text-base font-semibold leading-6 tracking-[-0.02em] text-app-text-strong">
            {job.title}
          </h3>
          {job.match_score !== null ? (
            <span className={dashboardBadgeClassName}>
              {job.match_score} %
              <span className="sr-only"> de correspondance</span>
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-2 text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
          <Building2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{job.company}</span>
        </p>
      </div>

      <p className="line-clamp-3 min-h-[72px] text-sm leading-6 tracking-[-0.02em] text-app-text-secondary">
        {job.description?.trim() ||
          "Ouvre l’offre pour consulter la mission et les prérequis."}
      </p>

      <span className={cn(dashboardCtaClassName, "mt-auto")}>Voir l’offre</span>
    </Link>
  );
}

function RecommendationEmptyState() {
  return (
    <DashboardInset className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="rounded-app-surface bg-app-control p-3" aria-hidden>
        <Plus className="size-6 text-app-text" />
      </span>
      <div className="space-y-2">
        <h3 className="text-base font-medium leading-6 text-app-text-strong">Ajoute tes offres</h3>
        <p className="max-w-md text-xs leading-5 text-app-text-secondary">
          Enregistre les offres qui t’intéressent pour retrouver ici tes recommandations.
        </p>
      </div>
      <Link href="/jobs" className={cn(dashboardCtaClassName, "w-full sm:w-auto sm:px-6")}>
        <Plus className="size-4" aria-hidden />
        Ajouter des offres
      </Link>
    </DashboardInset>
  );
}
