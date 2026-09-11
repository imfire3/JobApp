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
 * - viewport locked (no page chrome scroll)
 * - children size to content (no forced full-height stretch)
 * - short content is vertically centered; tall content scrolls in the shell
 * - cards may also use max-h + overflow-y-auto for inner scroll
 */
export function AuthCardShell({ children, className }: AuthCardShellProps) {
  return (
    <div className="box-border flex h-dvh flex-col overflow-hidden bg-background px-4 pb-4 pt-8 sm:px-8">
      <div
        className={cn(
          "mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain",
          AUTH_CARD_MAX_WIDTH,
          className
        )}
      >
        <div className="my-auto w-full [&>*]:w-full">
          {children}
        </div>
      </div>
    </div>
  )
}
