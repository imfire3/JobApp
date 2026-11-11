import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input variants.
 * - `default`: dense app form control (kept for existing screens).
 * - `control`: Figma "Forms/Input" — 50 px, 8 px radius, 1.25 px stroke,
 *   `bg/control` + `border/control`. Use it for onboarding and settings forms.
 * - `auth`: 44 px auth card field (login / signup).
 */
const inputVariants = cva(
  "w-full min-w-0 text-base leading-6 transition-colors outline-none touch-manipulation file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "h-12 rounded-lg border border-input bg-transparent px-4 py-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 dark:bg-input/30 dark:disabled:bg-input/80",
        control:
          "h-(--app-control-height) rounded-app-control border-(length:--app-stroke) border-app-border-strong bg-app-control px-3 py-3 text-app-text placeholder:text-app-text-muted focus-visible:border-app-text-secondary focus-visible:ring-2 focus-visible:ring-app-text-secondary/30 disabled:bg-app-control/60 dark:bg-app-control",
        /** Figma date segments (JJ / MM / AAAA) use the 14 px radius. */
        date:
          "h-[50.5px] rounded-app-date border-(length:--app-stroke) border-app-border-strong bg-app-control px-2 py-3 text-center text-app-text tabular-nums placeholder:text-app-text-muted focus-visible:border-app-text-secondary focus-visible:ring-2 focus-visible:ring-app-text-secondary/30 dark:bg-app-control",
        auth:
          "h-11 rounded-[6px] border-(length:--app-stroke) border-app-border bg-app-control px-3 text-sm text-app-text placeholder:text-app-text-muted focus-visible:border-app-text-muted focus-visible:ring-1 focus-visible:ring-app-text-secondary dark:bg-app-control",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>

function Input({ className, type, variant = "default", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
