import { VehicleSearchRepository } from "@/repositories/vehicle-search.repository";
import type {
  VehicleSearchFilters,
  VehicleSearchPage,
} from "@/types/search";

export class VehicleSearchService {
  constructor(private repository: VehicleSearchRepository) {}

  async searchVehicles(
    fleetId: string | null,
    filters: VehicleSearchFilters,
    page: number,
    pageSize: number,
  ): Promise<VehicleSearchPage> {
    if (!fleetId) {
      return {
        items: [],
        totalCount: 0,
        hasMore: false,
        page,
        pageSize,
      };
    }

    const hasAnyFilter =
      filters.query.trim().length > 0 ||
      filters.status.size > 0 ||
      filters.maint.size > 0 ||
      filters.alert.size > 0;

    if (!hasAnyFilter) {
      return {
        items: [],
        totalCount: 0,
        hasMore: false,
        page,
        pageSize,
      };
    }

    const normalizedFilters: VehicleSearchFilters = {
      ...filters,
      query: filters.query.trim().slice(0, 80),
    };

    try {
      return await this.repository.searchByFleet(
        fleetId,
        normalizedFilters,
        page,
        pageSize,
      );
    } catch {
      throw new Error("Impossible d'effectuer la recherche des véhicules.");
    }
  }
}
