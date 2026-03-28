import * as React from "react";

import { cn } from "@/lib/utils";

export interface FilterChipItem {
  id: string;
  label: string;
}

export interface FilterChipsProps extends React.HTMLAttributes<HTMLDivElement> {
  items: FilterChipItem[];
  /** Identifiant sélectionné ; null = aucun filtre actif */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Libellé du chip « tout » */
  allLabel?: string;
}

/**
 * Filtres horizontaux scrollables : pattern natif, évite les menus desktop.
 */
export function FilterChips({
  items,
  selectedId,
  onSelect,
  allLabel = "Tout",
  className,
  ...props
}: FilterChipsProps) {
  return (
    <div
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label="Filtres"
      {...props}
    >
      <FilterChip
        pressed={selectedId === null}
        onClick={() => onSelect(null)}
        id="filter-all"
      >
        {allLabel}
      </FilterChip>
      {items.map((item) => (
        <FilterChip
          key={item.id}
          id={`filter-${item.id}`}
          pressed={selectedId === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </FilterChip>
      ))}
    </div>
  );
}

interface FilterChipProps {
  id: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function FilterChip({ id, pressed, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={pressed}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium touch-manipulation transition-colors",
        pressed
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/80 bg-background text-muted-foreground hover:border-border hover:text-foreground active:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}
