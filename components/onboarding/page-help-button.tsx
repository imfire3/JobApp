"use client"

import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  pathnameToGuidePage,
  requestProductGuide,
  type GuidePageId,
} from "@/lib/onboarding/product-guide"

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
  const handleClick = () => {
    const resolved =
      pageId ??
      (typeof window !== "undefined"
        ? pathnameToGuidePage(window.location.pathname)
        : null)
    if (!resolved) return
    requestProductGuide({ type: "page", pageId: resolved })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handleClick}
      aria-label={label}
    >
      <CircleHelp className="mr-1.5 h-4 w-4" />
      {label}
    </Button>
  )
}

export function RelaunchGuideButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={() => requestProductGuide({ type: "first-visit" })}
      aria-label="Relancer le guide"
    >
      <CircleHelp className="mr-1.5 h-4 w-4" />
      Aide
    </Button>
  )
}
