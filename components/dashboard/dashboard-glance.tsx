import { BarChart3 } from "lucide-react";
import type { DashboardStats } from "@/lib/dashboard/overview";
import {
  DashboardInset,
  DashboardSectionHeader,
  DashboardSurface,
} from "@/components/dashboard/dashboard-surface";
import { cn } from "@/lib/utils";

export function DashboardGlance({
  stats,
  className,
}: {
  stats: DashboardStats;
  className?: string;
}) {
  const items = [
    { id: "active-offers", label: "Offres actives", value: stats.activeOffers },
    { id: "applications", label: "Candidatures", value: stats.applications },
    { id: "interviews", label: "Entretiens", value: stats.interviews },
    {
      id: "response-rate",
      label: "Taux de réponse",
      value: stats.responseRate === null ? "—" : `${stats.responseRate} %`,
    },
  ];

  return (
    <DashboardSurface className={cn("min-w-0", className)}>
      <DashboardSectionHeader
        icon={BarChart3}
        title="En un coup d’œil"
        description="Les chiffres clés de ta recherche, sans détail technique."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <DashboardInset key={item.id} className="flex flex-col gap-2">
            <p className="text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
              {item.label}
            </p>
            <p className="text-[28px] font-medium leading-7 tabular-nums text-app-text">
              {item.value}
            </p>
          </DashboardInset>
        ))}
      </div>
    </DashboardSurface>
  );
}
