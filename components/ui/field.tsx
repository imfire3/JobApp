import { CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"

/** Label + control stack with a fixed 8px gap. */
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-base leading-6 font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-base leading-6 text-muted-foreground", className)}
      {...props}
    />
  )
}

function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn(
        "flex items-center gap-1 text-base leading-6 text-destructive",
        className
      )}
      {...props}
    >
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </p>
  )
}

export { Field, FieldDescription, FieldError, FieldLabel }
