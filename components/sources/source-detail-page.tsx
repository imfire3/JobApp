"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Play } from "lucide-react";

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

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sources/slug/${sourceSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load source");
      setSource(data.source);
      setRuns(data.sync_runs ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load source");
    } finally {
      setLoading(false);
    }
  }, [sourceSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = useMemo(() => {
    if (!source) return "";
    if (source.status === "connected") return "Connected";
    if (source.status === "error") return "Error";
    return "Not configured";
  }, [source]);

  async function updateSource(payload: Partial<SourceRecord>) {
    if (!source) return;
    const res = await fetch(`/api/sources/${source.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update source");
    setSource(data.source);
  }

  async function runSourceSync() {
    if (!source) return;
    const res = await fetch(`/api/sync/source/${source.id}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Source sync failed");
    toast.success(`Run now done: ${data.imported} imported`);
    await load();
  }

  if (loading) {
    return <Card className="h-60 animate-pulse" />;
  }

  if (!source) {
    return (
      <Card id="sync-logs">
        <CardContent className="py-10 text-center text-muted-foreground">
          Source not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{source.name}</h1>
          <p className="text-sm text-muted-foreground">
            Connection status, authentication, health, and sync logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={source.status === "error" ? "destructive" : source.status === "connected" ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
          <Button onClick={() => runSourceSync().catch((e) => toast.error(e.message))}>
            <Play className="mr-2 h-4 w-4" />
            Run now
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connector settings</CardTitle>
          <CardDescription>Tracked searches are managed globally in the Jobs page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Enabled</Label>
            <Switch
              checked={source.enabled}
              onCheckedChange={(checked) =>
                updateSource({ enabled: checked }).catch((e) => toast.error(e.message))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Sync schedule</Label>
            <Input
              value={source.sync_schedule}
              onChange={(e) => setSource({ ...source, sync_schedule: e.target.value })}
              onBlur={() =>
                updateSource({ sync_schedule: source.sync_schedule }).catch((e) =>
                  toast.error(e.message)
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Sync time</Label>
            <Input
              type="time"
              value={source.sync_time}
              onChange={(e) => setSource({ ...source, sync_time: e.target.value })}
              onBlur={() =>
                updateSource({ sync_time: source.sync_time }).catch((e) =>
                  toast.error(e.message)
                )
              }
            />
          </div>
          <p className="text-sm text-muted-foreground">Last sync: {source.last_sync_at ? new Date(source.last_sync_at).toLocaleString() : "—"}</p>
          <p className="text-sm text-muted-foreground">Next sync: {source.next_sync_at ? new Date(source.next_sync_at).toLocaleString() : "—"}</p>
          <p className="text-sm text-muted-foreground">Authentication: Not configured (mock)</p>
          <p className="text-sm text-muted-foreground">Health: Healthy</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last sync logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sync logs yet.</p>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={run.status === "failed" ? "destructive" : "secondary"}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(run.started_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground">
                  Found {run.jobs_found} · Imported {run.jobs_imported} · Duplicates {run.jobs_skipped_duplicates}
                </p>
                {run.error_message && (
                  <p className="mt-1 text-xs text-red-500">{run.error_message}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
