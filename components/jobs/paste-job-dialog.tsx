"use client";

import { useId, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildWebsitePasteRow, rowsToCsvFile } from "@/lib/imports/jobs-file";

export type PasteImportJobRef = {
  id: string;
  url: string;
  title: string;
  company: string;
  was_duplicate: boolean;
};

export type PasteImportPayload = {
  error?: string;
  message?: string;
  jobs?: PasteImportJobRef[];
  summary?: {
    imported?: number;
    duplicates?: number;
  };
};

export function PasteJobDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (data: PasteImportPayload) => Promise<void>;
}) {
  const id = useId();
  const urlId = `${id}-url`;
  const textId = `${id}-text`;
  const errorId = `${id}-error`;

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose(nextOpen: boolean) {
    if (nextOpen || submitting) return;
    onOpenChange(false);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const row = buildWebsitePasteRow(url, text);
    if (!row) {
      setError("Colle le texte de l’offre à importer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", rowsToCsvFile([row]));
      const res = await fetch("/api/import-jobs", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as PasteImportPayload;
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Import échoué"
        );
      }
      await onImported(data);
      setUrl("");
      setText("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import échoué");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Coller une offre</DialogTitle>
          <DialogDescription>
            Colle l’URL de l’offre (facultatif) et son texte. JobTracker en
            crée une offre dans ton board.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={urlId}>URL de l’offre (facultatif)</Label>
            <Input
              id={urlId}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://exemple.com/offre"
              autoComplete="url"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={textId}>Texte de l’offre</Label>
            <Textarea
              id={textId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Titre, entreprise, mission…"
              rows={8}
              disabled={submitting}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-h-40 resize-y"
            />
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || text.trim().length === 0}
              aria-busy={submitting || undefined}
            >
              <ClipboardPaste
                className={submitting ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
                aria-hidden
              />
              {submitting ? "Import…" : "Importer l’offre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
