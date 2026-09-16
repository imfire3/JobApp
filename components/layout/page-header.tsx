import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  children: ReactNode
  className?: string
  /** Extra sticky block under the title row (e.g. tab bar). */
  stickyExtra?: ReactNode
}

/**
 * Sticky page header: stays pinned under the mobile nav (and at top on desktop)
 * while the page scrolls. Uses a solid/blurred background so content doesn't show through.
 */
export const PageHeader = ({ children, className, stickyExtra }: PageHeaderProps) => {
  return (
    <div
      className={cn(
        "sticky top-14 z-30 -mx-4 mb-6 border-b border-border/80 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:top-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {children}
      </div>
      {stickyExtra ? <div className="mt-4">{stickyExtra}</div> : null}
    </div>
  )
}

type StickyFooterProps = {
  children: ReactNode
  className?: string
}

/**
 * Sticky footer actions: stay fixed to the bottom of the viewport when scrolling
 * reaches them (content above can scroll independently).
 */
export const StickyFooter = ({ children, className }: StickyFooterProps) => {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}
