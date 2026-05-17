/**
 * Recherche universelle : agrégation véhicules (RPC), entretiens, alertes
 * + contenu statique (pages, actions, paramètres, FAQ, guides).
 * Dépendances injectables pour les tests.
 */

import { supabase } from "@/integrations/supabase/client";
import { FULL_SEARCH_INDEX } from "@/data/search/searchIndex";

export type UniversalSearchResultKind =
  | "vehicle"
  | "maintenance"
  | "alert"
  | "page"
  | "action"
  | "setting"
  | "faq"
  | "guide";

export interface UniversalSearchResult {
  id: string;
  kind: UniversalSearchResultKind;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "green" | "yellow" | "red";
  href: string;
  /** Poids statique (1–10) — présent pour les items non-Supabase. */
  weight?: number;
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

// ── Recherche statique (index local, 2G-friendly) ─────────────────────────────

function normalizeStr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Recherche dans l'index statique (pages, actions, paramètres, FAQ, guides).
 * Instantané, zéro réseau.
 */
export function searchStaticIndex(query: string): UniversalSearchResult[] {
  const q = normalizeStr(query.trim());
  if (q.length < 2) return [];

  const results: UniversalSearchResult[] = [];

  for (const item of FULL_SEARCH_INDEX) {
    const titleN    = normalizeStr(item.title);
    const subtitleN = normalizeStr(item.subtitle);
    const tagsN     = item.tags.map(normalizeStr);

    const matches =
      titleN.includes(q) ||
      subtitleN.includes(q) ||
      tagsN.some((t) => t.includes(q));

    if (matches) {
      results.push({
        id:       item.id,
        kind:     item.type as UniversalSearchResultKind,
        title:    item.title,
        subtitle: item.subtitle,
        href:     item.route ?? "/help",
        weight:   item.weight,
      });
    }
  }

  return results;
}
