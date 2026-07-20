import { supabase } from "@/integrations/supabase/client";
import type {
  VehicleSearchFilters,
  VehicleSearchPage,
  VehicleSearchResult,
} from "@/types/search";

type VehicleSearchRow = VehicleSearchResult & { total_count: number };

export class VehicleSearchRepository {
  async searchByFleet(
    fleetId: string,
    filters: VehicleSearchFilters,
    page: number,
    pageSize: number,
  ): Promise<VehicleSearchPage> {
    const offset = page * pageSize;
    const { data, error } = await supabase.rpc("rechercher_vehicules_flotte", {
      p_fleet_id: fleetId,
      p_query: filters.query.trim(),
      p_status: Array.from(filters.status),
      p_maint: Array.from(filters.maint),
      p_alert: Array.from(filters.alert),
      p_sort_by: filters.sortBy,
      p_limit: pageSize,
      p_offset: offset,
    });

    if (error) {
      console.error("Error searching vehicles:", error);
      throw new Error(error.message);
    }

    const rows = (data || []) as VehicleSearchRow[];
    const totalCount = Number(rows[0]?.total_count ?? 0);
    const items: VehicleSearchResult[] = rows.map(({ total_count, ...item }) => item);
    return {
      items,
      totalCount,
      hasMore: offset + items.length < totalCount,
      page,
      pageSize,
    };
  }
}
