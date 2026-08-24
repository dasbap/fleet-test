import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useUniversalSearch,
  type SearchGroup,
  type SearchResult,
  type SearchResultType,
} from "@/hooks/useUniversalSearch";

interface UniversalSearchProps {
  fleetId: string | null;
  onNavigate?: (href: string) => void;
  className?: string;
}

interface SearchTriggerProps {
  onClick: () => void;
  className?: string;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

interface SearchDialogProps {
  open: boolean;
  fleetId: string | null;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  globalIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

interface SearchResultGroupProps {
  group: SearchGroup;
  query: string;
  selectedIndex: number;
  indexOffset: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

const TYPE_ICONS: Record<SearchResultType, ReactNode> = {
  vehicle: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M3 10h14M5.5 13h9M4 7l1.5-3h9L16 7" strokeLinecap="round" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M14.5 3.5l2 2-9 9-3 1 1-3 9-9z" />
      <path d="M12.5 5.5l2 2" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M10 3l7.5 13H2.5L10 3z" />
      <path d="M10 9v3M10 14.5v.5" />
    </svg>
  ),
  page: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round" />
    </svg>
  ),
  action: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7z" strokeLinejoin="round" />
    </svg>
  ),
  setting: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  ),
  faq: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="8" />
      <path d="M8 8c0-1.1.9-2 2-2s2 .9 2 2c0 1.5-2 2-2 2.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path d="M10 4C8 2 4 2 3 3v13c1-1 5-1 7 1 2-2 6-2 7-1V3c-1-1-5-1-7 1z" />
      <path d="M10 4v14" strokeLinecap="round" />
    </svg>
  ),
};

const TYPE_ICON_CLASSES: Record<SearchResultType, string> = {
  vehicle:     "bg-primary/10 text-primary",
  maintenance: "bg-info/10 text-info",
  alert:       "bg-destructive/10 text-destructive",
  page:        "bg-blue-500/10 text-blue-500",
  action:      "bg-amber-500/10 text-amber-600",
  setting:     "bg-slate-500/10 text-slate-500",
  faq:         "bg-violet-500/10 text-violet-600",
  guide:       "bg-emerald-500/10 text-emerald-600",
};

const BADGE_CLASSES: Record<NonNullable<SearchResult["badgeVariant"]>, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  default: "bg-muted text-muted-foreground",
};

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M17 17l-3.5-3.5" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn("animate-spin", className)}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return <>{text}</>;
  }

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
        if (!isMatch) {
          return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
        }
        return (
          <mark key={`${part}-${index}`} className="rounded-sm bg-primary/20 px-[1px] font-medium text-primary">
            {part}
          </mark>
        );
      })}
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-4 p-2" aria-busy="true" aria-label="Chargement des résultats">
      {[3, 2].map((count) => (
        <div key={count} className="space-y-2">
          <div className="mx-3 h-3 w-24 animate-pulse rounded bg-muted" />
          {Array.from({ length: count }).map((_, index) => (
            <div key={`${count}-${index}`} className="mx-1 flex items-center gap-3 rounded-lg px-3 py-2.5">
              <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SearchEmpty({ query, noResultText, helperText }: { query: string; noResultText: string; helperText: string }) {
  return (
    <div className="py-10 text-center" role="status">
      <p className="text-sm font-medium text-foreground">{noResultText.replace("{query}", query)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
    </div>
  );
}

function SearchHint() {
  const { t } = useTranslation("common");
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">↑↓</kbd>
        {t("searchPalette.hintNavigate", { defaultValue: "Naviguer" })}
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">↵</kbd>
        {t("searchPalette.hintOpen", { defaultValue: "Ouvrir" })}
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">Esc</kbd>
        {t("searchPalette.hintClose", { defaultValue: "Fermer" })}
      </span>
      <span className="ml-auto flex items-center gap-1">
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
        {t("searchPalette.hintShortcut", { defaultValue: "Ouvrir la recherche" })}
      </span>
    </div>
  );
}

function SearchResultItem({
  result,
  query,
  isSelected,
  globalIndex,
  onSelect,
  onHover,
}: SearchResultItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected) {
      if (typeof itemRef.current?.scrollIntoView === "function") {
        itemRef.current.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isSelected]);

  return (
    <button
      ref={itemRef}
      id={`search-result-${globalIndex}`}
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(result)}
      onMouseEnter={() => onHover(globalIndex)}
      className={cn(
        "mx-1 flex w-[calc(100%-0.5rem)] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        isSelected ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg", TYPE_ICON_CLASSES[result.type])}>
        {TYPE_ICONS[result.type]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          <HighlightMatch text={result.title} query={query} />
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{result.subtitle}</p>
      </div>
      {result.badge ? (
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", BADGE_CLASSES[result.badgeVariant ?? "default"])}>
          {result.badge}
        </span>
      ) : null}
    </button>
  );
}

function SearchResultGroup({ group, query, selectedIndex, indexOffset, onSelect, onHover }: SearchResultGroupProps) {
  return (
    <div role="group" aria-label={group.label}>
      <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
      {group.results.map((result, index) => (
        <SearchResultItem
          key={result.id}
          result={result}
          query={query}
          isSelected={selectedIndex === indexOffset + index}
          globalIndex={indexOffset + index}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </div>
  );
}

export function SearchDialog({ open, fleetId, onClose, onNavigate }: SearchDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, groups, totalCount, status, selectedIndex, setSelectedIndex, flatResults, reset } =
    useUniversalSearch(fleetId);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    reset();
  }, [open, reset]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onClose();
      reset();
      if (onNavigate) {
        onNavigate(result.href);
        return;
      }
      navigate(result.href);
    },
    [navigate, onClose, onNavigate, reset],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, totalCount - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, -1));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const activeResult = selectedIndex >= 0 ? flatResults[selectedIndex] : undefined;
        if (activeResult) {
          handleSelect(activeResult);
        }
        return;
      }

      if (event.key === "Escape") {
        onClose();
      }
    },
    [flatResults, handleSelect, onClose, selectedIndex, setSelectedIndex, totalCount],
  );

  const groupOffsets = useMemo(() => {
    let offset = 0;
    return groups.map((group) => {
      const currentOffset = offset;
      offset += group.results.length;
      return { group, offset: currentOffset };
    });
  }, [groups]);

  const showSkeleton = status === "loading";
  const showResults = status === "success" && totalCount > 0;
  const showEmpty = status === "success" && query.length >= 2 && totalCount === 0;
  const showIdle = status === "idle";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-2xl">
        <DialogTitle className="sr-only">{t("searchPalette.dialogTitle", { defaultValue: "Recherche universelle" })}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("searchPalette.dialogDescription", {
            defaultValue: "Rechercher dans les véhicules, pages, actions rapides, FAQ et paramètres.",
          })}
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <IconSearch className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="search-listbox"
            aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
            placeholder={t("searchPalette.placeholder", {
              defaultValue: "Rechercher un véhicule, une page, une action, de l'aide…",
            })}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {showSkeleton ? <IconSpinner className="h-4 w-4 text-muted-foreground" /> : null}
          {query && !showSkeleton ? (
            <button
              type="button"
              aria-label={t("searchPalette.clear", { defaultValue: "Effacer la recherche" })}
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-muted transition-colors hover:bg-accent"
            >
              <IconClose className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
          ) : null}
        </div>
        <p className="sr-only" aria-live="polite">
          {showSkeleton
            ? t("searchPalette.loadingState", { defaultValue: "Recherche en cours" })
            : showResults
              ? t("searchPalette.resultsCount", { count: totalCount, defaultValue: "{{count}} résultats" })
              : showEmpty
                ? t("searchPalette.noResults", { defaultValue: "Aucun résultat" })
                : ""}
        </p>

        <div id="search-listbox" role="listbox" aria-label={t("searchPalette.resultsAria", { defaultValue: "Résultats de recherche" })} className="max-h-[420px] overflow-y-auto py-2">
          {showSkeleton ? <SearchSkeleton /> : null}
          {showResults
            ? groupOffsets.map(({ group, offset }) => (
                <SearchResultGroup
                  key={group.type}
                  group={group}
                  query={query}
                  selectedIndex={selectedIndex}
                  indexOffset={offset}
                  onSelect={handleSelect}
                  onHover={setSelectedIndex}
                />
              ))
            : null}
          {showEmpty ? (
            <SearchEmpty
              query={query}
              noResultText={t("searchPalette.emptyTitle", { defaultValue: "Aucun résultat pour « {query} »" })}
              helperText={t("searchPalette.emptyHint", {
                defaultValue: "Essayez la plaque, le nom du conducteur ou le type d'entretien.",
              })}
            />
          ) : null}
          {showIdle ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("searchPalette.idlePrompt", { defaultValue: "Saisissez au moins 2 caractères" })}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 px-6">
                {["CM-", "DVIR", "scanner", "aide", "panne"].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setQuery(hint)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <SearchHint />
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ onClick, className, buttonRef }: SearchTriggerProps) {
  const { t } = useTranslation("common");
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={t("searchPalette.openAria", { defaultValue: "Ouvrir la recherche" })}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50",
        className,
      )}
    >
      <IconSearch className="h-3.5 w-3.5" />
      <span className="hidden text-xs sm:inline">{t("actions.search", { defaultValue: "Rechercher" })}…</span>
      <span className="ml-1 hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">
        {isMac ? "⌘K" : "Ctrl+K"}
      </span>
    </button>
  );
}

export function UniversalSearch({ fleetId, onNavigate, className }: UniversalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openDialog = useCallback(() => setIsOpen(true), []);
  const closeDialog = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((previousValue) => !previousValue);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  if (!fleetId) {
    return null;
  }

  return (
    <div className={className ? cn(className) : "hidden md:block"}>
      <SearchTrigger onClick={openDialog} buttonRef={triggerRef} />
      <SearchDialog open={isOpen} fleetId={fleetId} onClose={closeDialog} onNavigate={onNavigate} />
    </div>
  );
}
