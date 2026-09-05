import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared responsive width for all auth / onboarding cards */
export const AUTH_CARD_MAX_WIDTH = "max-w-lg"

type AuthCardShellProps = {
  children: ReactNode
  className?: string
}

/**
 * Screen locked to 100dvh. Card grows with content; when it would hit the
 * bottom (24px margin), the column scrolls instead of growing the page.
 */
export function AuthCardShell({ children, className }: AuthCardShellProps) {
  return (
    <div
      className={cn(
        "box-border flex h-dvh items-start justify-center overflow-hidden bg-muted/30 px-4 py-6",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto max-h-full w-full overflow-y-auto overscroll-contain",
          AUTH_CARD_MAX_WIDTH
        )}
      >
        {children}
      </div>
    </div>
  )
}
