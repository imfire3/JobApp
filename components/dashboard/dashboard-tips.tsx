import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  FileText,
  Import,
  Puzzle,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { DashboardTip, DashboardTipIcon } from "@/lib/dashboard/overview";
import {
  DashboardSectionHeader,
  DashboardSurface,
} from "@/components/dashboard/dashboard-surface";
import { cn } from "@/lib/utils";

const TIP_ICONS: Record<DashboardTipIcon, typeof Sparkles> = {
  calendar: CalendarClock,
  send: Send,
  sparkles: Sparkles,
  briefcase: Briefcase,
  "file-text": FileText,
  user: UserRound,
  puzzle: Puzzle,
  search: Search,
  import: Import,
};

export function DashboardTips({
  tips,
  className,
}: {
  tips: DashboardTip[];
  className?: string;
}) {
  return (
    <DashboardSurface className={cn("min-w-0 @container", className)}>
      <DashboardSectionHeader
        icon={Sparkles}
        title="À faire maintenant"
        description="Une action concrète, choisie selon tes offres et tes candidatures."
      />
      <ul className="grid flex-1 gap-4 sm:grid-cols-2 @lg:grid-cols-3">
        {tips.map((tip) => {
          const Icon = TIP_ICONS[tip.icon];
          return (
            <li key={tip.id} className="min-w-0">
              <Link
                href={tip.href}
                className="relative flex h-full flex-col gap-2 rounded-app-surface border border-app-border bg-app-surface p-4 pr-12 transition-colors hover:border-app-border-strong hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-5 shrink-0 text-app-text" aria-hidden />
                  <span className="text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
                    {tip.title}
                  </span>
                </span>
                <span className="text-sm leading-6 tracking-[-0.02em] text-app-text-subtle">
                  {tip.description}
                </span>
                <ArrowUpRight
                  className="absolute right-4 top-4 size-5 text-app-text-secondary"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardSurface>
  );
}
