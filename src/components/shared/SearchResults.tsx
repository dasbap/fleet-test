import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { VehicleSearchFilters, VehicleSearchResult } from "@/types/search";

const STATUS_LABELS = {
  active: "Actif",
  maintenance: "Maintenance",
  idle: "Inactif",
} as const;

const STATUS_STYLES = {
  active: "bg-primary/10 text-primary",
  maintenance: "bg-warning/15 text-warning",
  idle: "bg-muted text-muted-foreground",
} as const;

const MAINT_LABELS = {
  queued: "À planifier",
  in_progress: "En cours",
  blocked: "Bloqué",
} as const;

const MAINT_STYLES = {
  queued: "bg-info/15 text-info",
  in_progress: "bg-primary/10 text-primary",
  blocked: "bg-destructive/10 text-destructive",
} as const;

function formatKm(km: number): string {
  return `${km.toLocaleString("fr-FR")} km`;
}

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, index) =>
        re.test(part) ? (
          <mark key={index} className="rounded px-px bg-warning/20 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

interface SearchResultsProps {
  results: VehicleSearchResult[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  query: string;
  sortBy: VehicleSearchFilters["sortBy"];
  selectedIdx: number;
  onSortChange: (sortBy: VehicleSearchFilters["sortBy"]) => void;
}

export function SearchResults({
  results,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  query,
  sortBy,
  selectedIdx,
  onSortChange,
}: SearchResultsProps) {
  const navigate = useNavigate();

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {loading ? (
            "Recherche..."
          ) : (
            <>
              <strong className="text-foreground">{results.length}</strong> véhicule
              {results.length > 1 ? "s" : ""}
            </>
          )}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          Trier:
          {(["plate", "km", "alert", "similarity"] as const).map((key) => (
            <button
              key={key}
              onClick={() => onSortChange(key)}
              className={cn(
                "rounded border px-2 py-0.5 transition-colors",
                sortBy === key
                  ? "border-border bg-background text-foreground"
                  : "border-transparent hover:text-foreground",
              )}
            >
              {{
                plate: "Plaque",
                km: "KM",
                alert: "Alerte",
                similarity: "Pertinence",
              }[key]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="divide-y divide-border">
          {[1, 2, 3].map((value) => (
            <div key={value} className="flex items-center gap-3 p-3">
              <Skeleton className="h-7 w-24 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="divide-y divide-border">
          {results.map((vehicle, index) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => navigate(`/dashboard/vehicles/${vehicle.id}`)}
              className={cn(
                "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                index === selectedIdx
                  ? "border-l-2 border-primary bg-muted/60"
                  : "hover:bg-muted/60",
              )}
            >
              <div className="min-w-[92px] flex-shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-center font-mono text-sm font-medium tracking-wide text-foreground">
                {highlight(vehicle.plate, query)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {highlight(
                    `${vehicle.brand ?? "Marque"} ${vehicle.model ?? "Modèle"}`,
                    query,
                  )}
                </p>
                <p className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                  <span>
                    {vehicle.driver_name
                      ? highlight(vehicle.driver_name, query)
                      : "Aucun conducteur"}
                  </span>
                  <span>·</span>
                  <span>{formatKm(vehicle.km)}</span>
                </p>
              </div>

              {vehicle.pending_maint_type && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    MAINT_STYLES[vehicle.pending_maint_type],
                  )}
                >
                  {MAINT_LABELS[vehicle.pending_maint_type]}
                </span>
              )}

              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  STATUS_STYLES[vehicle.status],
                )}
              >
                {STATUS_LABELS[vehicle.status]}
              </span>
            </button>
          ))}
          {hasMore && onLoadMore && (
            <div className="p-2">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full rounded border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
              >
                {loadingMore ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <p className="mb-1 text-base">Aucun résultat</p>
          <span className="text-xs">
            Modifiez la recherche ou réinitialisez les filtres.
          </span>
        </div>
      )}
    </div>
  );
}
