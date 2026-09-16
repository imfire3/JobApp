"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  PAGE_HELP,
  pathnameToGuidePage,
  type GuidePageId,
} from "@/lib/onboarding/page-help"

type PageHelpButtonProps = {
  pageId?: GuidePageId
  label?: string
  className?: string
  /** Custom trigger renderer — receives an open() callback. */
  trigger?: (open: () => void) => React.ReactNode
}

type PageHelpDialogProps = {
  pageId: GuidePageId
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PageHelpDialog({ pageId, open, onOpenChange }: PageHelpDialogProps) {
  const help = PAGE_HELP[pageId]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{help?.title ?? "Aide"}</DialogTitle>
          <DialogDescription>
            Quelques repères pour utiliser cette page.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-4">
          {help?.tips.map((tip) => (
            <li key={tip.id} className="space-y-1">
              <p className="text-base font-medium">{tip.title}</p>
              <p className="text-base leading-relaxed text-muted-foreground">
                {tip.body}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

export function PageHelpButton({
  pageId,
  label = "Comprendre cette page",
  className,
  trigger,
}: PageHelpButtonProps) {
  const [open, setOpen] = useState(false)

  const resolved =
    pageId ??
    (typeof window !== "undefined"
      ? pathnameToGuidePage(window.location.pathname)
      : null)

  const help = resolved ? PAGE_HELP[resolved] : null

  const openDialog = () => setOpen(true)

  return (
    <>
      {trigger ? (
        trigger(openDialog)
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={className}
          onClick={openDialog}
          disabled={!help}
          aria-label={label}
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
      )}

      {resolved ? (
        <PageHelpDialog pageId={resolved} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  )
}