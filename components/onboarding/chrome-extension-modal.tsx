"use client";

import { Download, FolderOpen, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const EXTENSION_SEEN_KEY = "jobtracker_extension_seen";

type ChromeExtensionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
};

export function ChromeExtensionModal({
  open,
  onOpenChange,
  onDismiss,
}: ChromeExtensionModalProps) {
  function handleDismiss() {
    try {
      localStorage.setItem(EXTENSION_SEEN_KEY, "1");
    } catch {
      // ignore storage failures
    }
    onDismiss();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Installe l’extension Chrome
          </DialogTitle>
          <DialogDescription>
            Tes alertes sont prêtes. L’extension WTTJ te permet d’ajouter des offres Welcome to
            the Jungle dans un CSV, puis de les importer dans JobTracker.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              1
            </span>
            <span>
              Ouvre <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome://extensions</code>{" "}
              (ou <code className="rounded bg-muted px-1 py-0.5 text-xs">arc://extensions</code>)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              2
            </span>
            <span className="flex items-start gap-2">
              <FolderOpen className="mt-0.5 h-4 w-4 shrink-0" />
              Active le mode développeur, puis charge le dossier{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome-extension</code> du
              projet
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              3
            </span>
            <span className="flex items-start gap-2">
              <Download className="mt-0.5 h-4 w-4 shrink-0" />
              Sur une offre WTTJ, ajoute-la au CSV puis importe-le dans{" "}
              <strong className="text-foreground">Imports</strong>
            </span>
          </li>
        </ol>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handleDismiss}>
            Plus tard
          </Button>
          <Button type="button" onClick={handleDismiss}>
            J’ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
