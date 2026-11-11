"use client";

import { Button } from "@/components/ui/button";
import type { Job, JobStatus } from "@/types";
import {
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type BulkUpdates = Partial<Pick<Job, "status" | "selected">> & {
  selection_only?: boolean;
};

type JobBulkActionsProps = {
  selectedCount: number;
  loading?: boolean;
  coverLetterLoading?: boolean;
  deleteLoading?: boolean;
  analyzeLoading?: boolean;
  onBulkUpdate: (updates: BulkUpdates) => void | Promise<void>;
  onBulkAnalyze?: () => void | Promise<void>;
  onGenerateCoverLetters?: () => void | Promise<void>;
  onBulkDelete?: () => void | Promise<void>;
};

const STATUS_ACTIONS: Array<{
  label: string;
  updates: BulkUpdates;
  icon: typeof Archive;
  variant?: "default" | "secondary" | "outline" | "destructive";
}> = [
  {
    label: "Sauvegarder",
    updates: { status: "selected" as JobStatus, selected: true },
    icon: CheckCircle2,
    variant: "outline",
  },
  {
    label: "Candidature envoyée",
    updates: { status: "applied" as JobStatus },
    icon: CheckCircle2,
    variant: "outline",
  },
  {
    label: "Entretien en cours",
    updates: { status: "interview" as JobStatus },
    icon: MessageSquare,
    variant: "secondary",
  },
  {
    label: "Archiver",
    updates: { status: "archived" as JobStatus, selected: false },
    icon: Archive,
    variant: "outline",
  },
  {
    label: "Refuser",
    updates: { status: "rejected" as JobStatus, selected: false },
    icon: XCircle,
    variant: "destructive",
  },
];

export function JobBulkActions({
  selectedCount,
  loading = false,
  coverLetterLoading = false,
  deleteLoading = false,
  analyzeLoading = false,
  onBulkUpdate,
  onBulkAnalyze,
  onGenerateCoverLetters,
  onBulkDelete,
}: JobBulkActionsProps) {
  if (selectedCount === 0) return null;

  const busy = loading || coverLetterLoading || deleteLoading || analyzeLoading;
  const label = `${selectedCount} offre${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
      <div
        className="pointer-events-auto flex w-full max-w-5xl animate-in items-center gap-2 rounded-xl border bg-popover/95 p-2 shadow-xl ring-1 ring-foreground/5 backdrop-blur duration-200 fade-in slide-in-from-bottom-4 supports-[backdrop-filter]:bg-popover/85"
        role="toolbar"
        aria-label={`Actions pour ${label}`}
      >
        <div className="flex shrink-0 items-center gap-2 pl-1">
          <span
            className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-sm font-semibold tabular-nums text-primary-foreground"
            aria-live="polite"
          >
            {selectedCount}
          </span>
          <span className="hidden text-base font-medium sm:inline">
            {selectedCount > 1 ? "offres sélectionnées" : "offre sélectionnée"}
          </span>
          <span className="sr-only sm:hidden">{label}</span>
        </div>

        <div className="h-6 w-px shrink-0 bg-border" aria-hidden="true" />

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {onBulkAnalyze ? (
            <Button type="button" size="sm" variant="secondary" className="shrink-0" disabled={busy} onClick={() => void onBulkAnalyze()}>
              {analyzeLoading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {analyzeLoading ? "Comparaison…" : `Comparer (${selectedCount})`}
            </Button>
          ) : null}
          {STATUS_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                size="sm"
                variant={action.variant ?? "outline"}
                className="shrink-0"
                disabled={busy}
                onClick={() => void onBulkUpdate(action.updates)}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Icon />
                )}
                {action.label}
              </Button>
            );
          })}

          {onGenerateCoverLetters ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              disabled={busy}
              onClick={() => void onGenerateCoverLetters()}
            >
              {coverLetterLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <FileText />
              )}
              {coverLetterLoading
                ? "Génération…"
                : `Préparer lettres (${selectedCount})`}
            </Button>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          {onBulkDelete ? (
            <div className="flex shrink-0 items-center gap-1">
              <span className="sr-only sm:not-sr-only sm:text-xs sm:text-muted-foreground">Irréversible</span>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void onBulkDelete()}
                aria-label={deleteLoading ? "Suppression en cours" : `Supprimer définitivement ${selectedCount} offre${selectedCount > 1 ? "s" : ""}`}
              >
                {deleteLoading ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
                Supprimer ({selectedCount})
              </Button>
            </div>
          ) : null}

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void onBulkUpdate({ selected: false, selection_only: true })
            }
            aria-label="Tout décocher"
            title="Tout décocher"
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}
