import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardKpis } from "@/types";
import type { ComponentType, ReactNode } from "react";
import {
  Briefcase,
  Cable,
  CheckCircle2,
  CircleAlert,
  FileText,
  Clock4,
  TimerReset,
  Send,
  Star,
  Target,
} from "lucide-react";

interface KpiCardsProps {
  kpis: DashboardKpis;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  extra,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  extra?: ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {extra}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
      <KpiCard label="Jobs found today" value={String(kpis.jobsFoundToday)} icon={Briefcase} />
      <KpiCard label="New jobs" value={String(kpis.newJobs)} icon={Target} />
      <KpiCard label="Cover letters" value={String(kpis.coverLettersGenerated)} icon={FileText} />
      <KpiCard label="Applications sent" value={String(kpis.applicationsSent)} icon={Send} />
      <KpiCard
        label="Avg. match score"
        value={kpis.averageMatchScore !== null ? `${kpis.averageMatchScore}%` : "—"}
        icon={Star}
      />
      <KpiCard
        label="Last sync"
        value={kpis.lastSyncTime ? new Date(kpis.lastSyncTime).toLocaleTimeString() : "—"}
        icon={Clock4}
      />
      <KpiCard
        label="Next sync"
        value={kpis.nextSyncTime ? new Date(kpis.nextSyncTime).toLocaleTimeString() : "—"}
        icon={TimerReset}
      />
      <KpiCard
        label="Source health"
        value={`${kpis.sourceHealth.connected} connected`}
        icon={Cable}
        extra={
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {kpis.sourceHealth.connected}
            </span>
            <span className="inline-flex items-center gap-1">
              <CircleAlert className="h-3 w-3" />
              {kpis.sourceHealth.error}
            </span>
          </p>
        }
      />
    </div>
  );
}
