"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { DashboardKpis, Job } from "@/types";
import { computeKpis } from "@/lib/jobs/utils";
import { Bot, Cable, Clock3, Sparkles } from "lucide-react";
import { PageHelpButton } from "@/components/onboarding/page-help-button";

type DashboardSummaryResponse = {
  jobs: Job[];
  last_sync_time: string | null;
  next_sync_time: string | null;
  source_health: {
    connected: number;
    notConfigured: number;
    error: number;
  };
  active_connectors: number;
  ai_recommendations: string[];
  recent_activity: Array<{
    time: string;
    label: string;
    message: string;
    phase: string;
  }>;
};

export function DashboardOverview() {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((payload) => {
        if (!payload || payload.error || !Array.isArray(payload.jobs)) {
          setData(null);
          return;
        }
        setData(payload);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const kpis: DashboardKpis = useMemo(() => {
    const base = computeKpis(data?.jobs ?? []);
    return {
      ...base,
      lastSyncTime: data?.last_sync_time ?? null,
      nextSyncTime: data?.next_sync_time ?? null,
      sourceHealth: data?.source_health ?? {
        connected: 0,
        notConfigured: 0,
        error: 0,
      },
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-tour="guide-dashboard"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d’ensemble de ta recherche et de ton activité récente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PageHelpButton pageId="dashboard" />
          <Link href="/sources" className={buttonVariants({ variant: "outline" })}>
            <Cable className="mr-2 h-4 w-4" />
            Gérer les sources
          </Link>
          <Link href="/jobs" className={buttonVariants({})}>
            Voir mes offres
          </Link>
        </div>
      </div>

      <KpiCards kpis={kpis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            ) : (data?.recent_activity?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet. Run a connector sync from Sources.
              </p>
            ) : (
              data?.recent_activity.map((item, index) => (
                <div key={`${item.time}-${index}`} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">
                    {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {item.label}
                  </p>
                  <p className="text-muted-foreground">{item.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.ai_recommendations ?? []).map((recommendation, index) => (
              <div key={index} className="rounded-md border p-3 text-sm">
                <p className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  <span>{recommendation}</span>
                </p>
              </div>
            ))}
            <div className="pt-2">
              <Link
                href="/profile-ai"
                className={buttonVariants({ variant: "secondary" })}
              >
                Refine profile & AI preferences
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
