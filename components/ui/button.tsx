import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-base font-medium whitespace-nowrap transition-all outline-none select-none touch-manipulation focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-app-action text-app-action-foreground hover:bg-app-action-hover aria-expanded:bg-app-action-hover",
        outline:
          "border-app-border-strong bg-app-surface text-app-text hover:bg-app-control hover:text-app-text-strong aria-expanded:bg-app-control aria-expanded:text-app-text-strong dark:border-app-border-strong dark:bg-app-surface dark:hover:bg-app-control",
        secondary:
          "bg-app-control text-app-text hover:bg-app-control/80 aria-expanded:bg-app-control aria-expanded:text-app-text",
        ghost:
          "text-app-text hover:bg-app-control hover:text-app-text-strong aria-expanded:bg-app-control aria-expanded:text-app-text-strong dark:hover:bg-app-control",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-12 min-h-12 gap-2 px-4 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        /** Figma onboarding / settings action (50 px, 8 px radius). */
        control:
          "h-(--app-control-height) min-h-(--app-control-height) gap-2 rounded-app-control px-4 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-base in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-10 min-h-10 gap-2 rounded-[min(var(--radius-md),12px)] px-3 text-base in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-14 min-h-14 gap-2 px-6 text-lg has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-12",
        "icon-xs":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-control": "size-(--app-control-height) rounded-app-control",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, sets `aria-busy` and disables the button. */
    loading?: boolean
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <Spinner
          data-slot="button-spinner"
          className={cn(size === "xs" && "size-3", size === "lg" && "size-5")}
        />
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
