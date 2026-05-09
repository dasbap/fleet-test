/**
 * Skeletons — Smart Fleet Africa (E-Samba)
 * Skeleton loaders réutilisables (stats, flotte, maintenance, activité, carte, tableaux).
 * Stack : React · TypeScript · Tailwind · composant Skeleton (shadcn)
 */

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Bloc de base (alias du Skeleton shadcn pour layouts denses). */
function Sk({ className, ...props }: ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn(className)} {...props} />;
}

// --- StatsBar Skeleton ---

export function StatsBarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <Sk className="h-3 w-24" />
            <Sk className="h-8 w-8 rounded-lg" />
          </div>
          <Sk className="h-7 w-16" />
          <Sk className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// --- VehicleCard Skeleton ---

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="w-full bg-muted" style={{ aspectRatio: "16/9" }} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Sk className="h-4 w-28" />
            <Sk className="h-3 w-20" />
          </div>
          <Sk className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Sk className="h-3 w-3 rounded-full" />
          <Sk className="h-3 w-24" />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <Sk className="h-3 w-20" />
          <Sk className="h-7 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// --- VehicleGrid Skeleton ---

export function VehicleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  );
}

// --- MaintenanceAlert Skeleton ---

export function MaintenanceAlertSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <Sk className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Sk className="h-3.5 w-3/4" />
        <Sk className="h-3 w-1/2" />
      </div>
      <Sk className="h-7 w-20 shrink-0 rounded-lg" />
    </div>
  );
}

export function MaintenanceListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <MaintenanceAlertSkeleton key={i} />
      ))}
    </div>
  );
}

// --- ActivityFeed (lignes) ; carte titre : dashboard/ActivityFeedSkeleton ---

export function ActivityFeedRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-border py-3 last:border-0">
          <Sk className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Sk
              className={cn(
                "h-3.5",
                i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-4/5" : "w-3/4",
              )}
            />
            <Sk className="h-3 w-1/3" />
          </div>
          <Sk className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// --- MapView Skeleton ---

export function MapViewSkeleton() {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-muted"
      style={{ aspectRatio: "16/7", minHeight: "220px" }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-card" />
      {[
        { top: "30%", left: "25%" },
        { top: "55%", left: "60%" },
        { top: "20%", left: "70%" },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute h-5 w-5 rounded-full border-2 border-card bg-muted"
          style={pos}
        />
      ))}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <Sk className="h-7 w-28 rounded-lg" />
        <Sk className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// --- Table Row Skeleton ---

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  const widths = ["w-24", "w-32", "w-20", "w-16", "w-28"];
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Sk className={cn("h-3.5", widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Sk className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Full Page Loader ---

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  );
}
