/**
 * Recherche universelle : agrégation véhicules (RPC), entretiens, alertes.
 * Dépendances injectables pour les tests.
 */

import { supabase } from "@/integrations/supabase/client";

export type UniversalSearchResultKind = "vehicle" | "maintenance" | "alert";

export interface UniversalSearchResult {
  id: string;
  kind: UniversalSearchResultKind;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "green" | "yellow" | "red";
  href: string;
}

export type UniversalSearchFilterState = {
  kind: UniversalSearchResultKind | "all";
};

/** Ports pour accès données (mockables en test). */
export interface UniversalSearchDeps {
  getUnifiedRows: (
    fleetId: string,
    normalizedQuery: string,
  ) => Promise<UniversalSearchResult[]>;
}

/**
 * Agrège les résultats selon le filtre d’onglet.
 * @param query texte saisi (sera normalisé en minuscules / trim)
 */
export async function searchAll(
  query: string,
  filter: UniversalSearchFilterState,
  fleetId: string | null,
  deps: UniversalSearchDeps,
): Promise<UniversalSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q || !fleetId) return [];

  const rows = await deps.getUnifiedRows(fleetId, q);
  if (filter.kind === "all") return rows;
  return rows.filter((row) => row.kind === filter.kind);
}

interface SearchFleetRow {
  id: string;
  result_type: UniversalSearchResultKind;
  title: string;
  subtitle: string | null;
  badge: string | null;
  badge_variant: string | null;
  href: string;
  score: number;
}

function mapBadgeColor(
  kind: UniversalSearchResultKind,
  value?: string | null,
): UniversalSearchResult["badgeColor"] {
  if (!value) return undefined;
  if (kind === "vehicle") {
    if (value === "success") return "green";
    if (value === "warning") return "yellow";
    return "yellow";
  }
  if (kind === "maintenance") return value === "success" ? "green" : "yellow";
  if (value === "critical") return "red";
  if (value === "high" || value === "warning" || value === "medium") return "yellow";
  return "green";
}

function createDefaultUniversalSearchDeps(): UniversalSearchDeps {
  return {
    getUnifiedRows: async (fleetId, query) => {
      const { data: rpcData, error } = await supabase.rpc("search_fleet", {
        search_query: query,
        max_per_type: 5,
        fleet_id_filter: fleetId,
      });

      if (error) {
        throw new Error("Impossible de charger la recherche unifiée.");
      }

      const rows = (rpcData as SearchFleetRow[] | null) ?? [];
      return rows.map((row) => ({
        id: row.id,
        kind: row.result_type,
        title: row.title,
        subtitle: row.subtitle ?? "",
        badge: row.badge ?? undefined,
        badgeColor: mapBadgeColor(row.result_type, row.badge_variant),
        href: row.href,
      }));
    },
  };
}

/** Dépendances réelles (Supabase + RPC flotte). */
export const defaultUniversalSearchDeps = createDefaultUniversalSearchDeps();
