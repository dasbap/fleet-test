import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VehicleSearchRepository } from "@/repositories/vehicle-search.repository";
import { VehicleSearchService } from "@/services/vehicle-search.service";
import type { VehicleSearchFilters } from "@/types/search";

const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_PAGE_SIZE = 20;

const vehicleSearchRepository = new VehicleSearchRepository();
const vehicleSearchService = new VehicleSearchService(vehicleSearchRepository);

export const DEFAULT_VEHICLE_SEARCH_FILTERS: VehicleSearchFilters = {
  query: "",
  status: new Set(),
  maint: new Set(),
  alert: new Set(),
  sortBy: "plate",
};

export function useVehicleSearch(fleetId: string | null) {
  const [filters, setFilters] = useState<VehicleSearchFilters>(
    DEFAULT_VEHICLE_SEARCH_FILTERS,
  );
  const [debouncedFilters, setDebouncedFilters] = useState<VehicleSearchFilters>(
    DEFAULT_VEHICLE_SEARCH_FILTERS,
  );
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.query.trim() ||
          filters.status.size ||
          filters.maint.size ||
          filters.alert.size,
      ),
    [filters],
  );

  const debouncedSignature = useMemo(
    () =>
      [
        debouncedFilters.query,
        debouncedFilters.sortBy,
        Array.from(debouncedFilters.status).sort().join(","),
        Array.from(debouncedFilters.maint).sort().join(","),
        Array.from(debouncedFilters.alert).sort().join(","),
      ].join("|"),
    [debouncedFilters],
  );

  useEffect(() => {
    setPage(0);
  }, [debouncedSignature]);

  const query = useQuery({
    queryKey: [
      "vehicle-search",
      fleetId,
      debouncedFilters.query,
      Array.from(debouncedFilters.status).sort().join(","),
      Array.from(debouncedFilters.maint).sort().join(","),
      Array.from(debouncedFilters.alert).sort().join(","),
      debouncedFilters.sortBy,
      page,
    ],
    queryFn: () =>
      vehicleSearchService.searchVehicles(
        fleetId,
        debouncedFilters,
        page,
        SEARCH_PAGE_SIZE,
      ),
    enabled: Boolean(fleetId) && hasFilters,
  });

  const setQuery = useCallback((queryValue: string) => {
    setFilters((prev) => ({ ...prev, query: queryValue }));
  }, []);

  const toggleFilter = useCallback(
    <K extends "status" | "maint" | "alert">(
      group: K,
      value: VehicleSearchFilters[K] extends Set<infer T> ? T : never,
    ) => {
      setFilters((prev) => {
        const nextSet = new Set(prev[group] as Set<unknown>);
        if (nextSet.has(value)) {
          nextSet.delete(value);
        } else {
          nextSet.add(value);
        }
        return { ...prev, [group]: nextSet };
      });
    },
    [],
  );

  const setSort = useCallback((sortBy: VehicleSearchFilters["sortBy"]) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setFilters(DEFAULT_VEHICLE_SEARCH_FILTERS);
    setDebouncedFilters(DEFAULT_VEHICLE_SEARCH_FILTERS);
    setPage(0);
  }, []);

  return {
    filters,
    results: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    hasMore: query.data?.hasMore ?? false,
    page,
    loading: query.isFetching,
    loadingMore: query.isFetching && page > 0,
    hasFilters,
    setQuery,
    toggleFilter,
    setSort,
    nextPage,
    reset,
  };
}
