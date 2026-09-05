import { cn } from "@/lib/utils"

type StickyPageHeaderProps = React.ComponentProps<"div">

/** Sticky chrome for page title / tabs inside AppShell’s scrolling main. */
export function StickyPageHeader({ children, className, ...props }: StickyPageHeaderProps) {
  return (
    <div
      {...props}
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-6 space-y-4 border-b border-border/70 bg-background/95 px-4 pb-4 pt-1 backdrop-blur-md supports-backdrop-filter:bg-background/85 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}
