import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared responsive width for all auth / onboarding cards (8-grid friendly) */
export const AUTH_CARD_MAX_WIDTH = "max-w-xl"

type AuthCardShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Auth / onboarding shell:
 * - card height follows content when short
 * - scrollport is locked to the viewport (never past the bottom edge)
 * - when the card is taller than the screen, it scrolls inside
 */
export function AuthCardShell({ children, className }: AuthCardShellProps) {
  return (
    <div className="box-border flex h-dvh flex-col overflow-hidden bg-muted/30 px-4 pb-4 pt-8 sm:px-8">
      <div
        className={cn(
          "mx-auto min-h-0 w-full flex-1 overflow-y-auto overscroll-contain [&>*]:w-full",
          AUTH_CARD_MAX_WIDTH,
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
