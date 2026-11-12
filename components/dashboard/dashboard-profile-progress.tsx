import Link from "next/link";
import { Check, Circle, UserRound } from "lucide-react";
import type { ProfileProgress } from "@/lib/dashboard/overview";
import {
  DashboardInset,
  DashboardSectionHeader,
  DashboardSurface,
  dashboardCtaClassName,
} from "@/components/dashboard/dashboard-surface";
import { cn } from "@/lib/utils";

export function DashboardProfileProgress({
  progress,
  className,
}: {
  progress: ProfileProgress;
  className?: string;
}) {
  return (
    <DashboardSurface className={cn("h-full min-w-0", className)}>
      <DashboardSectionHeader
        icon={UserRound}
        title={progress.percent === 100 ? "Ton profil est prêt" : "Complète ton profil"}
        description={
          progress.percent === 100
            ? "CV, profil et préférences analysés."
            : `${progress.completed} étape${progress.completed > 1 ? "s" : ""} sur ${progress.total} complétée${progress.completed > 1 ? "s" : ""}.`
        }
      />

      <DashboardInset className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-[30px] font-bold leading-9 tabular-nums tracking-[-0.02em] text-app-text-strong">
            {progress.percent} %
          </p>
          <div
            role="progressbar"
            aria-label="Progression du profil"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-app-border"
          >
            <div
              className="h-full rounded-full bg-app-action transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-4">
          {progress.milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  milestone.done
                    ? "border-app-success/60 bg-app-success/10 text-app-success"
                    : "border-app-border-strong bg-app-control text-app-text-secondary"
                )}
                aria-hidden
              >
                {milestone.done ? (
                  <Check className="size-4" />
                ) : (
                  <Circle className="size-2.5" />
                )}
              </span>
              <span className="text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
                {milestone.label}
              </span>
              <span className="sr-only">
                {milestone.done ? "complété" : "à compléter"}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href={progress.next?.href ?? "/profile-ai"}
          className={dashboardCtaClassName}
        >
          {progress.next?.label ?? "Voir mon profil"}
        </Link>
      </DashboardInset>
    </DashboardSurface>
  );
}
