"use client";

import { useId, useRef, useState } from "react";
import { CheckCircle2, ClipboardPaste } from "lucide-react";
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
import type { buildPasteCorrection } from "@/lib/imports/paste-correction";

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
  correctionJobId,
  initialText = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (data: PasteImportPayload) => Promise<void>;
  correctionJobId?: string;
  initialText?: string;
}) {
  const id = useId();
  const urlId = `${id}-url`;
  const textId = `${id}-text`;
  const errorId = `${id}-error`;

  const [url, setUrl] = useState("");
  const [text, setText] = useState(initialText);
  const [preview, setPreview] = useState<{ proposal: ReturnType<typeof buildPasteCorrection>; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleClose(nextOpen: boolean) {
    if (nextOpen || submitting) return;
    onOpenChange(false);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (!text.trim()) {
      setError("Colle le texte de l’offre à importer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(correctionJobId ? `/api/jobs/${correctionJobId}/correct-paste` : "/api/import-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview ? { confirm: true, token: preview.token } : { url: url.trim(), text }),
      });
      const data = (await res.json().catch(() => ({}))) as PasteImportPayload;
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Import échoué"
        );
      }
      if (correctionJobId && !preview) {
        setPreview(data as unknown as NonNullable<typeof preview>);
        scrollRef.current?.scrollTo({ top: 0 });
        return;
      }
      if (correctionJobId) {
        await onImported(data);
        onOpenChange(false);
        return;
      }
      // Keep the dialog open so several offers can be pasted in a row.
      setSuccess(
        typeof data.message === "string" && data.message.length > 0
          ? data.message
          : "Offre importée."
      );
      setUrl("");
      setText("");
      scrollRef.current?.scrollTo({ top: 0 });
      requestAnimationFrame(() => textareaRef.current?.focus());
      // The board refresh + match analysis can take a while: run it in the
      // background instead of blocking the dialog.
      void onImported(data).catch((err) => {
        setSuccess(null);
        setError(err instanceof Error ? err.message : "Import échoué");
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import échoué");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[85dvh] max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-7xl">
        <DialogHeader className="shrink-0 border-b p-4 pr-14 sm:p-6 sm:pr-16">
          <DialogTitle>{correctionJobId ? "Corriger l’offre par collage" : "Coller une offre"}</DialogTitle>
          <DialogDescription>
            {correctionJobId ? "Vérifie les champs proposés avant de valider. Le statut, les notes, les lettres et le suivi sont conservés. L’analyse sera à actualiser." : "Colle le texte complet de l’offre et ajoute son lien si tu l’as. Tu pourras ensuite la comparer à ton CV."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6"
          >
            {preview ? (
              <section aria-label="Champs proposés" className="space-y-3 rounded-app-control border border-app-border p-4">
                <h2 className="font-semibold">Champs proposés — rien n’est encore enregistré</h2>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(preview.proposal).filter(([key]) => key !== "experience_level").map(([key, value]) => (
                    <div key={key} className={key === "description" ? "min-w-0 sm:col-span-2" : "min-w-0"}>
                      <dt className="text-sm text-app-text-secondary">{({title: "Titre", company: "Entreprise", city: "Lieu", contract_type: "Contrat", remote_mode: "Télétravail", salary_min: "Salaire minimum", salary_max: "Salaire maximum", experience_min_years: "Expérience (années)", published_at: "Date de publication", description: "Description nettoyée"} as Record<string, string>)[key] ?? key}</dt>
                      <dd className="whitespace-pre-wrap break-words">{value == null ? "Non renseigné" : key === "remote_mode" ? ({hybrid:"Hybride",remote:"À distance",onsite:"Sur site",unknown:"Non renseigné"} as Record<string,string>)[String(value)] ?? String(value) : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}
            {success ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-emerald-600/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">{success}</p>
                  <p className="text-emerald-800/80 dark:text-emerald-300/80">
                    Tu peux ajouter une autre offre ou fermer cette fenêtre.
                  </p>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={urlId}>Lien de l’offre (facultatif)</Label>
              <Input
                id={urlId}
                type="url"
                value={url}
                onChange={(event) => { setUrl(event.target.value); setPreview(null); }}
                placeholder="https://exemple.com/offre"
                autoComplete="url"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={textId}>Texte de l’offre</Label>
              <Textarea
                id={textId}
                ref={textareaRef}
                value={text}
                onChange={(event) => { setText(event.target.value); setPreview(null); }}
                placeholder="Colle le texte complet : poste, entreprise, missions et profil recherché…"
                rows={16}
                disabled={submitting}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className="min-h-[50vh] resize-y"
              />
              {error ? (
                <p id={errorId} role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-t-none p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              {success ? "Fermer" : "Annuler"}
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
              {submitting ? "Traitement…" : correctionJobId ? preview ? "Valider la correction" : "Prévisualiser la correction" : "Importer l’offre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
