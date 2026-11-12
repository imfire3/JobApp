import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section wrappers follow the dashboard's Figma auto-layout. The visible
 * cards themselves use DashboardInset's shared surface styles.
 */
export const dashboardSurfaceClassName =
  "flex min-w-0 flex-col gap-6";

export const dashboardInsetClassName =
  "min-w-0 rounded-app-surface border border-app-border bg-app-surface p-4";

/** Outline action used at the bottom of dashboard cards (Figma "CTA 3"). */
export const dashboardCtaClassName =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-app-surface border border-app-border-default bg-app-bg/5 px-4 text-sm font-medium text-app-text-secondary transition-colors hover:border-app-text-secondary hover:text-app-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface";

export const dashboardBadgeClassName =
  "flex h-8 shrink-0 items-center justify-center rounded-app-badge bg-app-control px-3 text-base font-medium tabular-nums text-app-text-strong";

export function DashboardSurface({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn(dashboardSurfaceClassName, className)} {...props} />
  );
}

export function DashboardInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(dashboardInsetClassName, className)} {...props} />
  );
}

export function DashboardSectionHeader({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Icon className="size-5 shrink-0 text-app-text" aria-hidden />
        <h2 className="text-lg font-semibold leading-7 tracking-[-0.02em] text-app-text">
          {title}
        </h2>
      </div>
      <p className="text-sm leading-5 tracking-[-0.02em] text-app-text-subtle">
        {description}
      </p>
    </div>
  );
}
