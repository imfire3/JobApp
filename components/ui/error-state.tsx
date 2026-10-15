import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

interface ErrorStateProps extends React.ComponentProps<"div"> {
  title?: string
  description?: React.ReactNode
  role?: "alert" | "status"
}

function ErrorState({
  className,
  title,
  description,
  role = "alert",
  children,
  ...props
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive",
        className
      )}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium leading-6">{title}</p> : null}
        {description ? <p className="text-base leading-6">{description}</p> : null}
        {children}
      </div>
    </div>
  )
}

export { ErrorState }
