/**
 * Recherche universelle : agrégation véhicules (RPC), entretiens, alertes.
 * Dépendances injectables pour les tests.
 */

import { supabase } from "@/integrations/supabase/client";
import { VehicleSearchRepository } from "@/repositories/vehicle-search.repository";
import { DEFAULT_VEHICLE_SEARCH_FILTERS } from "@/hooks/useVehicleSearch";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { OperationalAlertSeverityDto } from "@/types/dto/alert.dto";
import type { VehicleSearchResult, VehicleSearchStatus } from "@/types/search";

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

export interface MaintenanceSearchRow {
  id: string;
  vehicle_id: string;
  status: string;
  planned_at: string | null;
  closed_at: string | null;
  notes: string | null;
  vehicle: { registration: string } | null;
}

export interface AlertSearchRow {
  id: string;
  vehicle_id: string | null;
  severity: OperationalAlertSeverityDto;
  message: string;
  vehicle: { registration: string } | null;
}

/** Ports pour accès données (mockables en test). */
export interface UniversalSearchDeps {
  getVehicleSearchItems: (
    fleetId: string,
    normalizedQuery: string,
  ) => Promise<VehicleSearchResult[]>;
  getMaintenanceRows: (
    fleetId: string,
    normalizedQuery: string,
  ) => Promise<MaintenanceSearchRow[]>;
  getAlertRows: (
    fleetId: string,
    normalizedQuery: string,
  ) => Promise<AlertSearchRow[]>;
}

function vehicleStatusBadgeColor(
  status: VehicleSearchStatus,
): UniversalSearchResult["badgeColor"] {
  if (status === "active") return "green";
  if (status === "maintenance") return "yellow";
  return "yellow";
}

function alertSeverityBadgeColor(
  severity: OperationalAlertSeverityDto,
): UniversalSearchResult["badgeColor"] {
  if (severity === "critical") return "red";
  if (severity === "high" || severity === "medium") return "yellow";
  return "green";
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

  const results: UniversalSearchResult[] = [];

  if (filter.kind === "all" || filter.kind === "vehicle") {
    const items = await deps.getVehicleSearchItems(fleetId, q);
    items.forEach((v) => {
      results.push({
        id: v.id,
        kind: "vehicle",
        title: `${v.plate} — ${[v.brand, v.model].filter(Boolean).join(" ")}`.trim(),
        subtitle: `${v.km.toLocaleString("fr-FR")} km · ${v.driver_name ?? "—"} · ${v.status}`,
        badge: v.status,
        badgeColor: vehicleStatusBadgeColor(v.status),
        href: ROUTE_PATHS.dashboardVehicleDetail(v.id),
      });
    });
  }

  if (filter.kind === "all" || filter.kind === "maintenance") {
    const records = await deps.getMaintenanceRows(fleetId, q);
    records.forEach((r) => {
      const reg = r.vehicle?.registration ?? r.vehicle_id.slice(0, 8);
      const planned = r.planned_at
        ? new Date(r.planned_at).toLocaleDateString("fr-FR")
        : "—";
      results.push({
        id: r.id,
        kind: "maintenance",
        title: `Entretien (${r.status}) — ${reg}`,
        subtitle: `Planifié : ${planned} · ${r.notes?.slice(0, 80) ?? ""}`,
        badge: r.closed_at ? "terminé" : "en cours",
        badgeColor: r.closed_at ? "green" : "yellow",
        href: `${ROUTE_PATHS.dashboardMaintenance}?job=${encodeURIComponent(r.id)}`,
      });
    });
  }

  if (filter.kind === "all" || filter.kind === "alert") {
    const alerts = await deps.getAlertRows(fleetId, q);
    alerts.forEach((a) => {
      const reg = a.vehicle?.registration ?? "—";
      results.push({
        id: a.id,
        kind: "alert",
        title: a.message,
        subtitle: `${reg} · Sévérité : ${a.severity}`,
        badge: a.severity,
        badgeColor: alertSeverityBadgeColor(a.severity),
        href: ROUTE_PATHS.dashboardAlertDetail(a.id),
      });
    });
  }

  return results;
}

const vehicleSearchRepository = new VehicleSearchRepository();

function createDefaultUniversalSearchDeps(): UniversalSearchDeps {
  return {
    getVehicleSearchItems: async (fleetId, query) => {
      const page = await vehicleSearchRepository.searchByFleet(
        fleetId,
        { ...DEFAULT_VEHICLE_SEARCH_FILTERS, query },
        0,
        5,
      );
      return page.items;
    },
    getMaintenanceRows: async (fleetId, query) => {
      const { data } = await supabase
        .from("travaux_maintenance")
        .select(
          "id, vehicle_id, status, planned_at, closed_at, notes, vehicle:vehicules!travaux_maintenance_vehicle_id_fkey(registration)",
        )
        .eq("fleet_id", fleetId)
        .ilike("notes", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data as MaintenanceSearchRow[] | null) ?? [];
    },
    getAlertRows: async (fleetId, query) => {
      const { data } = await supabase
        .from("alertes_automatiques")
        .select(
          "id, vehicle_id, severity, message, vehicle:vehicules!alertes_automatiques_vehicle_id_fkey(registration)",
        )
        .eq("fleet_id", fleetId)
        .eq("resolved", false)
        .ilike("message", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data as AlertSearchRow[] | null) ?? [];
    },
  };
}

/** Dépendances réelles (Supabase + RPC flotte). */
export const defaultUniversalSearchDeps = createDefaultUniversalSearchDeps();
