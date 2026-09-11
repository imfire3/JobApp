"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Download, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import type { Job } from "@/types"

interface CoverLetterModalProps {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (jobId: string, coverLetter: string) => Promise<void>
  onRegenerate?: (jobId: string) => Promise<void>
  isRegenerating?: boolean
}

export function CoverLetterModal({
  job,
  open,
  onOpenChange,
  onSave,
  onRegenerate,
  isRegenerating,
}: CoverLetterModalProps) {
  const [text, setText] = useState("")
  const [angleBriefing, setAngleBriefing] = useState("")
  const [subject, setSubject] = useState("")
  const [coachNotes, setCoachNotes] = useState<string[]>([])

  useEffect(() => {
    setText(job?.cover_letter ?? "")
    setAngleBriefing(job?.cover_letter_angle_briefing?.trim() ?? "")
    setSubject(job?.cover_letter_subject?.trim() ?? "")
    setCoachNotes(job?.cover_letter_coach_notes ?? [])
  }, [job])

  if (!job) return null

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast.success("Lettre copiée dans le presse-papiers")
  }

  async function handleCopySubject() {
    if (!subject) return
    await navigator.clipboard.writeText(subject)
    toast.success("Objet copié")
  }

  async function handleDownload() {
    if (!text) return
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `lettre-${job!.company.replace(/\s+/g, "-").toLowerCase()}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("Lettre téléchargée")
  }

  async function handleSave() {
    await onSave(job!.id, text)
    toast.success("Lettre enregistrée")
    onOpenChange(false)
  }

  async function handleRegenerate() {
    if (!onRegenerate) return
    await onRegenerate(job!.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lettre de motivation — {job.company}</DialogTitle>
          <DialogDescription>
            {job.title} · Angle, lettre et notes coach — copie / télécharge la
            lettre seule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {angleBriefing ? (
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-3">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Angle
              </p>
              <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {angleBriefing}
              </p>
            </div>
          ) : null}

          {subject ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Objet
                </p>
                <p className="truncate text-base text-foreground">{subject}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleCopySubject()}
                aria-label="Copier l’objet"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Lettre
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className="font-mono text-base leading-relaxed"
              aria-label="Corps de la lettre de motivation"
            />
          </div>

          {coachNotes.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/80 bg-background/60 p-3">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Notes coach
              </p>
              <ul className="space-y-2 text-base leading-snug text-foreground/90">
                {coachNotes.map((note, index) => (
                  <li key={`coach-${index}`} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/50"
                      aria-hidden
                    />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
          {onRegenerate ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRegenerate()}
              disabled={isRegenerating}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
              />
              {isRegenerating ? "Régénération…" : "Régénérer"}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void handleCopy()}>
            <Copy className="mr-2 h-4 w-4" />
            Copier
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDownload()}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </Button>
          <Button type="button" onClick={() => void handleSave()}>
            <Save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
