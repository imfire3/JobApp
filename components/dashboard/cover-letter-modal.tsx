"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "@/types";

interface CoverLetterModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (jobId: string, coverLetter: string) => Promise<void>;
  onRegenerate?: (jobId: string) => Promise<void>;
  isRegenerating?: boolean;
}

export function CoverLetterModal({
  job,
  open,
  onOpenChange,
  onSave,
  onRegenerate,
  isRegenerating,
}: CoverLetterModalProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(job?.cover_letter ?? "");
  }, [job]);

  if (!job) return null;

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Cover letter copied to clipboard");
  }

  async function handleDownload() {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cover-letter-${job!.company.replace(/\s+/g, "-").toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Cover letter downloaded");
  }

  async function handleSave() {
    await onSave(job!.id, text);
    toast.success("Cover letter saved");
    onOpenChange(false);
  }

  async function handleRegenerate() {
    if (!onRegenerate) return;
    await onRegenerate(job!.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cover letter — {job.company}</DialogTitle>
          <DialogDescription>
            {job.title} · Edit, copy or download before applying
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          className="font-mono text-sm leading-relaxed"
        />
        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          {onRegenerate ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button type="button" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
