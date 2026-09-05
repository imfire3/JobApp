"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { PageHelpButton } from "@/components/onboarding/page-help-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { Cable, Clock3, Play, Settings2, ScrollText } from "lucide-react";

interface SourceCard {
  id: string;
  name: string;
  slug: string;
  status: "connected" | "not_configured" | "error";
  last_sync_at: string | null;
  next_sync_at: string | null;
  jobs_imported_today: number;
  enabled: boolean;
  auth_configured?: boolean;
  health?: "healthy" | "degraded" | "error";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusLabel(status: SourceCard["status"]) {
  if (status === "connected") return "Connected";
  if (status === "error") return "Error";
  return "Not configured";
}

function statusVariant(status: SourceCard["status"]): "default" | "secondary" | "destructive" {
  if (status === "connected") return "default";
  if (status === "error") return "destructive";
  return "secondary";
}

export function SourcesPage() {
  const [sources, setSources] = useState<SourceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error("Failed to load sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sources");
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function syncNow(sourceId: string) {
    setSyncingId(sourceId);
    try {
      const res = await fetch(`/api/sync/source/${sourceId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(`Run now complete: ${data.imported} imported, ${data.skipped} duplicates`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <StickyPageHeader data-tour="guide-sources">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
            <p className="text-sm text-muted-foreground">
              Services de collecte d’offres — actuellement en démonstration. Utilise les imports
              pour ajouter tes offres.
            </p>
          </div>
          <PageHelpButton pageId="sources" />
        </div>
      </StickyPageHeader>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-52 animate-pulse" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No sources yet. Reload this page to initialize default connectors.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sources.map((source) => (
            <Card key={source.id} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cable className="h-5 w-5" />
                  {source.name}
                </CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <Badge variant={statusVariant(source.status)}>{statusLabel(source.status)}</Badge>
                  <span>{source.enabled ? "Enabled" : "Disabled"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-center justify-between">
                  <span>Authentication</span>
                  <span>{source.auth_configured ? "Configured" : "Not configured"}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    Last sync
                  </span>
                  <span>{formatDate(source.last_sync_at)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Next sync</span>
                  <span>{formatDate(source.next_sync_at)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Health</span>
                  <span>{source.health ?? "healthy"}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span>Jobs imported today</span>
                  <span>{source.jobs_imported_today}</span>
                </p>
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/sources/${source.slug}`}
                    className={buttonVariants({ variant: "outline", className: "flex-1" })}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                  <Button
                    className="flex-1"
                    onClick={() => syncNow(source.id)}
                    disabled={syncingId === source.id}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {syncingId === source.id ? "Running..." : "Run now"}
                  </Button>
                  <Link
                    href={`/sources/${source.slug}#sync-logs`}
                    className={buttonVariants({ variant: "ghost", className: "px-3" })}
                    aria-label="View logs"
                    title="View logs"
                  >
                    <ScrollText className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
