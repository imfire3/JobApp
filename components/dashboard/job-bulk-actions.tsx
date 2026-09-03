"use client";

import { Button } from "@/components/ui/button";
import type { Job, JobStatus } from "@/types";
import {
  Archive,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquare,
  XCircle,
} from "lucide-react";

type BulkUpdates = Partial<Pick<Job, "status" | "selected">>;

type JobBulkActionsProps = {
  selectedCount: number;
  loading?: boolean;
  coverLetterLoading?: boolean;
  onBulkUpdate: (updates: BulkUpdates) => void | Promise<void>;
  onGenerateCoverLetters?: () => void | Promise<void>;
};

const ACTIONS: Array<{
  label: string;
  updates: BulkUpdates;
  icon: typeof Archive;
  variant?: "default" | "secondary" | "outline" | "destructive";
}> = [
  {
    label: "Sélectionner",
    updates: { status: "selected" as JobStatus, selected: true },
    icon: CheckCircle2,
    variant: "outline",
  },
  {
    label: "Candidaté",
    updates: { status: "applied" as JobStatus },
    icon: CheckCircle2,
    variant: "outline",
  },
  {
    label: "En cours",
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
    label: "Rejeter",
    updates: { status: "rejected" as JobStatus, selected: false },
    icon: XCircle,
    variant: "destructive",
  },
];

export function JobBulkActions({
  selectedCount,
  loading = false,
  coverLetterLoading = false,
  onBulkUpdate,
  onGenerateCoverLetters,
}: JobBulkActionsProps) {
  if (selectedCount === 0) return null;

  const busy = loading || coverLetterLoading;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2"
      role="toolbar"
      aria-label={`Actions pour ${selectedCount} offres sélectionnées`}
    >
      <span className="mr-1 text-sm font-medium">
        {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
      </span>

      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant={action.variant ?? "outline"}
            disabled={busy}
            onClick={() => void onBulkUpdate(action.updates)}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="mr-1.5 h-3.5 w-3.5" />
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
          disabled={busy}
          onClick={() => void onGenerateCoverLetters()}
        >
          {coverLetterLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1.5 h-3.5 w-3.5" />
          )}
          {coverLetterLoading
            ? "Génération…"
            : `Cover letters (${selectedCount})`}
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void onBulkUpdate({ selected: false })}
      >
        Tout décocher
      </Button>
    </div>
  );
}
