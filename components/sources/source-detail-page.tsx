"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceRecord {
  id: string;
  name: string;
  slug: string;
  status: "connected" | "not_configured" | "error";
  enabled: boolean;
  sync_schedule: string;
  sync_time: string;
  last_sync_at: string | null;
  next_sync_at: string | null;
  ingestion_mode?: "api" | "extension" | "url_or_extension";
  supports_server_sync?: boolean;
  mode_label?: string;
  display_status_label?: string;
  alternate_href?: string | null;
  alternate_label?: string | null;
  auth_configured?: boolean;
}

interface RunRecord {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  jobs_imported: number;
  jobs_skipped_duplicates: number;
  error_message: string | null;
}

export function SourceDetailPage({ sourceSlug }: { sourceSlug: string }) {
  const [source, setSource] = useState<SourceRecord | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sources/slug/${sourceSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger la source");
      setSource(data.source);
      setRuns(data.sync_runs ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger la source"
      );
    } finally {
      setLoading(false);
    }
  }, [sourceSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = useMemo(() => {
    if (!source) return "";
    return source.display_status_label ?? source.mode_label ?? source.status;
  }, [source]);

  async function updateSource(payload: Partial<SourceRecord>) {
    if (!source) return;
    const res = await fetch(`/api/sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Mise à jour impossible");
    await load();
  }

  async function runSourceSync() {
    if (!source?.supports_server_sync) return;
    setSyncing(true);
    try {
      const path =
        source.slug === "france-travail"
          ? "/api/sources/france-travail/sync"
          : `/api/sync/source/${source.id}`;
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync échouée");
      toast.success(
        `Sync terminée : ${data.imported ?? 0} importée(s), ${data.skipped ?? 0} doublon(s)`
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync échouée");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <Card className="h-60 animate-pulse" />;
  }

  if (!source) {
    return (
      <Card id="sync-logs">
        <CardContent className="py-10 text-center text-muted-foreground">
          Source introuvable.
        </CardContent>
      </Card>
    );
  }

  const isApi = source.ingestion_mode === "api";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{source.name}</h1>
          <p className="text-base text-muted-foreground">
            {source.mode_label ??
              "Connexion, santé, et logs de synchronisation."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              source.status === "error"
                ? "destructive"
                : source.supports_server_sync
                  ? "default"
                  : "secondary"
            }
          >
            {statusLabel}
          </Badge>
          {source.supports_server_sync ? (
            <Button
              onClick={() => void runSourceSync()}
              disabled={syncing}
              aria-label="Lancer la synchronisation"
            >
              <Play className="mr-2 h-4 w-4" />
              {syncing ? "Sync…" : "Run now"}
            </Button>
          ) : source.alternate_href ? (
            <Link
              href={source.alternate_href}
              className={cn(buttonVariants())}
            >
              {source.alternate_label ?? "Importer"}
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Réglages connecteur</CardTitle>
          <CardDescription>
            {isApi
              ? "Synchronisation serveur via l’API officielle France Travail."
              : "Pas de collecteur serveur pour cette source — utilise l’extension ou Imports."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {isApi ? (
            <>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Activée</Label>
                <Switch
                  checked={source.enabled}
                  onCheckedChange={(checked) =>
                    updateSource({ enabled: checked }).catch((e) =>
                      toast.error(e.message)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Planning sync</Label>
                <Input
                  value={source.sync_schedule}
                  onChange={(e) =>
                    setSource({ ...source, sync_schedule: e.target.value })
                  }
                  onBlur={() =>
                    updateSource({ sync_schedule: source.sync_schedule }).catch(
                      (e) => toast.error(e.message)
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Heure sync</Label>
                <Input
                  type="time"
                  value={source.sync_time}
                  onChange={(e) =>
                    setSource({ ...source, sync_time: e.target.value })
                  }
                  onBlur={() =>
                    updateSource({ sync_time: source.sync_time }).catch((e) =>
                      toast.error(e.message)
                    )
                  }
                />
              </div>
              <p className="text-base text-muted-foreground">
                Dernière sync :{" "}
                {source.last_sync_at
                  ? new Date(source.last_sync_at).toLocaleString()
                  : "—"}
              </p>
              <p className="text-base text-muted-foreground">
                Auth API :{" "}
                {source.auth_configured
                  ? "Configurée (.env)"
                  : "Manquante — FRANCE_TRAVAIL_CLIENT_ID / SECRET"}
              </p>
            </>
          ) : (
            <div className="md:col-span-3 space-y-3 text-base text-muted-foreground">
              <p>
                Cette source n’expose pas d’API publique de recherche d’offres pour
                JobTracker. Capture une offre avec l’extension Chrome, ou colle
                l’URL / le texte dans Imports.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/extension"
                  className={buttonVariants({ variant: "secondary" })}
                >
                  Extension Chrome
                </Link>
                <Link
                  href="/imports?paste=1"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Coller une offre
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isApi ? (
        <Card id="sync-logs">
          <CardHeader>
            <CardTitle>Derniers logs de sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Aucun log pour le moment.
              </p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-md border p-3 text-base">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        run.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(run.started_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Trouvées {run.jobs_found} · Importées {run.jobs_imported} ·
                    Doublons {run.jobs_skipped_duplicates}
                  </p>
                  {run.error_message ? (
                    <p className="mt-1 text-base text-red-500">
                      {run.error_message}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
