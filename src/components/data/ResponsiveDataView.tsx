import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveDataViewProps {
  /** Vue table (desktop md+). */
  table: ReactNode;
  /** Cartes ou liste mobile (< md). */
  cards: ReactNode;
  className?: string;
}

/**
 * Bascule table desktop / cartes mobile sans scroll horizontal.
 */
export function ResponsiveDataView({ table, cards, className }: ResponsiveDataViewProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">{cards}</div>
      <div className="hidden md:block overflow-x-auto">{table}</div>
    </div>
  );
}
