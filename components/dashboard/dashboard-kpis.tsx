import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardKpiItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  href?: string;
};

const CARD_CLASSNAME =
  "flex min-w-0 flex-col gap-4 rounded-app-surface border border-app-border bg-app-surface p-4";

export function DashboardKpiCards({ items }: { items: DashboardKpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(({ id, label, value, hint, icon: Icon, href }) => {
        const content = (
          <>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex shrink-0 rounded-app-badge bg-app-control p-2">
                  <Icon className="size-5 text-app-text" aria-hidden />
                </span>
                <span className="min-w-0 text-sm font-medium leading-5 tracking-[-0.02em] text-app-text-strong">
                  {label}
                </span>
              </div>
              <p className="text-[28px] font-medium leading-7 tabular-nums text-app-text">
                {value}
              </p>
            </div>
            <p className="text-xs leading-5 tracking-[-0.02em] text-app-text-subtle">
              {hint}
            </p>
          </>
        );

        return href ? (
          <Link
            key={id}
            href={href}
            className={cn(
              CARD_CLASSNAME,
              "transition-colors hover:border-app-border-strong hover:bg-app-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-text-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas"
            )}
          >
            {content}
          </Link>
        ) : (
          <div key={id} className={CARD_CLASSNAME}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
