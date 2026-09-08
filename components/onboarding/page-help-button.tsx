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
}

export function PageHelpButton({
  pageId,
  label = "Comprendre cette page",
  className,
}: PageHelpButtonProps) {
  const [open, setOpen] = useState(false)

  const resolved =
    pageId ??
    (typeof window !== "undefined"
      ? pathnameToGuidePage(window.location.pathname)
      : null)

  const help = resolved ? PAGE_HELP[resolved] : null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
        disabled={!help}
        aria-label={label}
      >
        <CircleHelp className="mr-1.5 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
                <p className="text-sm font-medium">{tip.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tip.body}
                </p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
