import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardInset,
  DashboardSurface,
} from "@/components/dashboard/dashboard-surface";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement du tableau de bord…</span>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <DashboardInset key={index} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-9 rounded-[10px]" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-6 w-40 max-w-full" />
          </DashboardInset>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[3fr_1fr]">
        <DashboardSurface className="@container">
          <Skeleton className="h-7 w-52" />
          <div className="grid gap-4 sm:grid-cols-2 @lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <DashboardInset key={index} className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </DashboardInset>
            ))}
          </div>
        </DashboardSurface>
        <DashboardSurface>
          <Skeleton className="h-7 w-44" />
          <DashboardInset className="flex flex-col gap-6">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-40" />
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </DashboardInset>
        </DashboardSurface>
      </div>

      <div className="grid gap-4 xl:grid-cols-[3fr_1fr]">
        <DashboardSurface className="@container">
          <Skeleton className="h-7 w-44" />
          <div className="grid gap-4 sm:grid-cols-2 @lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <DashboardInset key={index} className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-12 w-full" />
              </DashboardInset>
            ))}
          </div>
        </DashboardSurface>
        <DashboardSurface>
          <Skeleton className="h-7 w-52" />
          <DashboardInset className="space-y-3">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
          </DashboardInset>
        </DashboardSurface>
      </div>

      <DashboardSurface>
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <DashboardInset key={index} className="space-y-3">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-7 w-12" />
            </DashboardInset>
          ))}
        </div>
      </DashboardSurface>
    </div>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <DashboardSurface role="alert">
      <DashboardInset className="flex w-full flex-col items-start gap-4">
        <div className="flex items-center gap-2 text-app-text">
          <CircleAlert className="size-5" aria-hidden />
          <h2 className="text-base font-semibold leading-6">
            Impossible de charger le tableau de bord
          </h2>
        </div>
        <p className="text-xs leading-5 text-app-text-subtle">
          Une erreur est survenue pendant la récupération de tes données.
        </p>
        <Button onClick={onRetry} variant="outline">
          Réessayer
        </Button>
      </DashboardInset>
    </DashboardSurface>
  );
}
