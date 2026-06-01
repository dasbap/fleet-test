import type { ReactNode } from "react";
import { ResponsiveDataView } from "@/components/data/ResponsiveDataView";

interface EsambaDataTableProps {
  table: ReactNode;
  cards: ReactNode;
  className?: string;
}

/** Table responsive : cartes mobile + table desktop. */
export function EsambaDataTable({ table, cards, className }: EsambaDataTableProps) {
  return <ResponsiveDataView table={table} cards={cards} className={className} />;
}
