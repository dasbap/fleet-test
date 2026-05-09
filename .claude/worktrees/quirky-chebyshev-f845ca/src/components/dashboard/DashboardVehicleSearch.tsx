import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVehicleSearch } from "@/hooks/useVehicleSearch";
import { SearchResults } from "@/components/shared/SearchResults";
import type { VehicleSearchFilters } from "@/types/search";

interface DashboardVehicleSearchProps {
  fleetId: string | null;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "maintenance", label: "Maintenance" },
  { value: "idle", label: "Inactif" },
] as const;

const MAINT_OPTIONS = [
  { value: "queued", label: "À planifier" },
  { value: "in_progress", label: "En cours" },
  { value: "blocked", label: "Bloqué" },
] as const;

const ALERT_OPTIONS = [
  { value: "critical", label: "Critique" },
  { value: "high", label: "Élevée" },
  { value: "medium", label: "Moyenne" },
  { value: "low", label: "Faible" },
] as const;

export function DashboardVehicleSearch({ fleetId }: DashboardVehicleSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [resultsOpen, setResultsOpen] = useState(false);

  const {
    filters,
    results,
    loading,
    loadingMore,
    hasMore,
    hasFilters,
    setQuery,
    toggleFilter,
    setSort,
    nextPage,
    reset,
  } = useVehicleSearch(fleetId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setResultsOpen(Boolean(filters.query.trim() || hasFilters));
  }, [filters.query, hasFilters]);

  const selectedVehicleId = useMemo(
    () => (selectedIdx >= 0 && selectedIdx < results.length ? results[selectedIdx]?.id : null),
    [results, selectedIdx],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter" && selectedVehicleId) {
      window.location.href = `/dashboard/vehicles/${selectedVehicleId}`;
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      reset();
      setSelectedIdx(-1);
      setResultsOpen(false);
      inputRef.current?.blur();
    }
  }

  const isActive = (group: "status" | "maint" | "alert", value: string) =>
    (filters[group] as Set<string>).has(value);

  if (!fleetId) {
    return null;
  }

  return (
    <div className="relative hidden w-full max-w-xl md:block">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-background transition-shadow",
          "focus-within:ring-2 focus-within:ring-primary/20",
        )}
      >
        <div className="flex items-center">
          <Search className="ml-3 h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={filters.query}
            onFocus={() => setResultsOpen(Boolean(filters.query.trim() || hasFilters))}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIdx(-1);
            }}
            onKeyDown={handleKeyDown}
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Plaque, marque, conducteur..."
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="mr-2 hidden rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">
            Ctrl+K
          </kbd>
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="h-10 border-l border-border px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Filtres
          </button>
        </div>

        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-3 py-2">
            <FilterGroup label="Statut">
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={isActive("status", option.value)}
                  onClick={() => toggleFilter("status", option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Entretien">
              {MAINT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={isActive("maint", option.value)}
                  onClick={() => toggleFilter("maint", option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Alerte">
              {ALERT_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={isActive("alert", option.value)}
                  onClick={() => toggleFilter("alert", option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterGroup>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  setSelectedIdx(-1);
                }}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive"
              >
                Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      {resultsOpen && (
        <SearchResults
          results={results}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={nextPage}
          query={filters.query}
          sortBy={filters.sortBy}
          selectedIdx={selectedIdx}
          onSortChange={setSort}
        />
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
