/**
 * Recherche universelle multi-critères (véhicules via RPC flotte, entretiens, alertes).
 * Stack : React · TypeScript · Tailwind · Supabase
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  searchAll,
  defaultUniversalSearchDeps,
  type UniversalSearchResult,
  type UniversalSearchFilterState,
  type UniversalSearchResultKind,
} from "@/services/universalSearch.service";

// ── UI ────────────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<UniversalSearchResultKind, string> = {
  vehicle: "Véhicule",
  maintenance: "Entretien",
  alert: "Alerte",
};

const KIND_ICONS: Record<UniversalSearchResultKind | "all", string> = {
  all: "🔍",
  vehicle: "🚛",
  maintenance: "🔧",
  alert: "⚠️",
};

// ── Composant ─────────────────────────────────────────────────────────────────

interface UniversalSearchProps {
  fleetId: string | null;
  onNavigate?: (href: string) => void;
  className?: string;
}

export function UniversalSearch({
  fleetId,
  onNavigate,
  className,
}: UniversalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState<UniversalSearchFilterState>({ kind: "all" });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(
    (searchQuery: string, f: UniversalSearchFilterState) => {
      clearTimeout(debounceRef.current);
      if (!searchQuery.trim() || !fleetId) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        const r = await searchAll(searchQuery, f, fleetId, defaultUniversalSearchDeps);
        setResults(r);
        setActiveIdx(0);
        setLoading(false);
      }, 200);
    },
    [fleetId],
  );

  useEffect(() => {
    doSearch(query, filter);
  }, [query, filter, doSearch]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[activeIdx]) {
      handleSelect(results[activeIdx]);
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (result: UniversalSearchResult) => {
    setOpen(false);
    setQuery("");
    if (onNavigate) onNavigate(result.href);
    else navigate(result.href);
  };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!fleetId) {
    return null;
  }

  return (
    <div className={cn("relative w-full max-w-xl hidden md:block", className)}>
      <div className="relative flex items-center">
        <svg
          className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher plaque, conducteur, entretien… (⌘K)"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-24 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {loading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <kbd className="hidden items-center gap-0.5 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {open && query.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            {(["all", "vehicle", "maintenance", "alert"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFilter((f) => ({ ...f, kind }))}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                  filter.kind === kind
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="text-[11px]">{KIND_ICONS[kind]}</span>
                {kind === "all" ? "Tout" : KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {results.length === 0 && !loading ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {query} »
              </div>
            ) : (
              results.map((result, idx) => (
                <button
                  key={`${result.kind}-${result.id}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    idx === activeIdx ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="shrink-0 text-base">{KIND_ICONS[result.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.subtitle}
                    </p>
                  </div>
                  {result.badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        result.badgeColor === "green" &&
                          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        result.badgeColor === "yellow" &&
                          "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                        result.badgeColor === "red" &&
                          "bg-red-500/15 text-red-600 dark:text-red-400",
                      )}
                    >
                      {result.badge}
                    </span>
                  )}
                  <svg
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ))
            )}
          </div>

          {results.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                ↑↓ naviguer · ↵ ouvrir · Esc fermer
              </span>
            </div>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[90]"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
