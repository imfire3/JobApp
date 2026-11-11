import Link from "next/link";
import { Compass } from "lucide-react";
import type { JourneyStep } from "@/lib/dashboard/overview";
import {
  DashboardSectionHeader,
  DashboardSurface,
} from "@/components/dashboard/dashboard-surface";
import { cn } from "@/lib/utils";

const STATE_LABEL: Record<JourneyStep["state"], string> = {
  done: "Terminé",
  current: "À faire",
  upcoming: "À venir",
};

export function DashboardJourney({
  step,
  className,
}: {
  step: JourneyStep | null;
  className?: string;
}) {
  return (
    <DashboardSurface className={cn("min-w-0", className)}>
      <DashboardSectionHeader
        icon={Compass}
        title="Ton parcours de recherche"
        description="Les étapes clés, du CV aux entretiens."
      />
      {step ? (
        <Link
          href={step.href}
          className="flex flex-1 rounded-app-surface border border-app-border bg-app-surface p-4 transition-colors hover:border-app-border-strong hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-col gap-2">
              <span className="flex w-fit items-center rounded-app-surface border-[1.5px] border-app-text-secondary bg-app-surface-raised px-3 py-0.5 text-sm leading-5 tracking-[-0.02em] text-app-text-secondary">
                {STATE_LABEL[step.state]}
              </span>
              <span className="text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
                {step.title}
              </span>
            </div>
            <span className="text-sm leading-6 tracking-[-0.02em] text-app-text-subtle">
              {step.description}
            </span>
          </div>
        </Link>
      ) : (
        <p className="text-xs leading-5 text-app-text-subtle">
          Ton parcours se construit au fil de tes candidatures.
        </p>
      )}
    </DashboardSurface>
  );
}
