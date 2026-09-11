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
  ingestion_mode?: "api" | "extension" | "url_or_extension";
  supports_server_sync?: boolean;
  mode_label?: string;
  display_status_label?: string;
  alternate_href?: string | null;
  alternate_label?: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function statusVariant(
  source: SourceCard
): "default" | "secondary" | "destructive" | "outline" {
  if (source.status === "error") return "destructive";
  if (source.supports_server_sync) return "default";
  if (source.ingestion_mode === "api") return "outline";
  return "secondary";
}

export function SourcesPage() {
  const [sources, setSources] = useState<SourceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sources");
      if (!res.ok) throw new Error("Impossible de charger les sources");
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible de charger les sources"
      );
      setSources([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function syncNow(source: SourceCard) {
    if (!source.supports_server_sync) return;
    setSyncingId(source.id);
    try {
      const path =
        source.slug === "france-travail"
          ? "/api/sources/france-travail/sync"
          : `/api/sync/source/${source.id}`;
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync échouée");
      toast.success(
        `Collecte terminée : ${data.imported ?? 0} importée(s), ${data.skipped ?? 0} doublon(s)`
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync échouée");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <StickyPageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sources</h1>
            <p className="text-base text-muted-foreground">
              France Travail via API officielle ; les autres job boards passent par
              l’extension Chrome ou Imports (URL / collage / CSV).
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
            Aucune source. Recharge la page pour initialiser le catalogue.
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
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(source)}>
                    {source.display_status_label ?? source.mode_label ?? "—"}
                  </Badge>
                  {source.mode_label ? (
                    <span className="text-muted-foreground">{source.mode_label}</span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-base text-muted-foreground">
                {source.ingestion_mode === "api" ? (
                  <p className="flex items-center justify-between">
                    <span>Authentification</span>
                    <span>
                      {source.auth_configured ? "Configurée" : "À configurer (.env)"}
                    </span>
                  </p>
                ) : null}
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    Dernière sync
                  </span>
                  <span>{formatDate(source.last_sync_at)}</span>
                </p>
                {source.ingestion_mode === "api" ? (
                  <p className="flex items-center justify-between">
                    <span>Offres importées (session)</span>
                    <span>{source.jobs_imported_today}</span>
                  </p>
                ) : (
                  <p className="text-sm">
                    Pas de sync serveur. Capture une offre via l’extension ou importe
                    un CSV / collage.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/sources/${source.slug}`}
                    className={buttonVariants({
                      variant: "outline",
                      className: "flex-1",
                    })}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Gérer
                  </Link>
                  {source.supports_server_sync ? (
                    <Button
                      className="flex-1"
                      onClick={() => void syncNow(source)}
                      disabled={syncingId === source.id}
                      aria-label={`Lancer la sync ${source.name}`}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {syncingId === source.id ? "Sync…" : "Run now"}
                    </Button>
                  ) : source.alternate_href ? (
                    <Link
                      href={source.alternate_href}
                      className={buttonVariants({
                        variant: "secondary",
                        className: "flex-1",
                      })}
                    >
                      {source.alternate_label ?? "Importer"}
                    </Link>
                  ) : null}
                  {source.ingestion_mode === "api" ? (
                    <Link
                      href={`/sources/${source.slug}#sync-logs`}
                      className={buttonVariants({
                        variant: "ghost",
                        className: "px-3",
                      })}
                      aria-label="Voir les logs"
                      title="Voir les logs"
                    >
                      <ScrollText className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
