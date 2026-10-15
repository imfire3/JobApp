import type { LucideIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center border border-dashed text-center",
  {
    variants: {
      size: {
        default: "gap-4 rounded-xl p-10",
        sm: "gap-3 rounded-lg p-8",
        inline: "gap-2 rounded-lg px-3 py-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface EmptyStateProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof emptyStateVariants> {
  icon?: LucideIcon
  title?: string
  description?: React.ReactNode
}

function EmptyState({
  className,
  size,
  icon: Icon,
  title,
  description,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(emptyStateVariants({ size }), className)}
      {...props}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn(
            "text-muted-foreground",
            size === "inline" ? "size-6" : size === "sm" ? "size-8" : "size-10"
          )}
        />
      ) : null}
      {title ? (
        <p className="text-base leading-6 font-medium text-foreground">{title}</p>
      ) : null}
      {description ? (
        <p className="max-w-prose text-base leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  )
}

export { EmptyState, emptyStateVariants }
