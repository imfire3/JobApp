import * as React from "react"

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

export { Field }
