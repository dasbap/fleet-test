import { describe, expect, it, vi } from "vitest";
import { VehicleSearchService } from "@/services/vehicle-search.service";
import type { VehicleSearchRepository } from "@/repositories/vehicle-search.repository";
import type { VehicleSearchFilters } from "@/types/search";

const baseFilters: VehicleSearchFilters = {
  query: "",
  status: new Set(),
  maint: new Set(),
  alert: new Set(),
  sortBy: "plate",
};

function createRepositoryMock() {
  return {
    searchByFleet: vi.fn(),
  };
}

describe("VehicleSearchService", () => {
  it("retourne un tableau vide si fleetId est absent", async () => {
    const repo = createRepositoryMock();
    const service = new VehicleSearchService(
      repo as unknown as VehicleSearchRepository,
    );

    const result = await service.searchVehicles(
      null,
      {
        ...baseFilters,
        query: "AB-123",
      },
      0,
      20,
    );

    expect(result.items).toEqual([]);
    expect(repo.searchByFleet).not.toHaveBeenCalled();
  });

  it("retourne un tableau vide si aucun filtre n'est actif", async () => {
    const repo = createRepositoryMock();
    const service = new VehicleSearchService(
      repo as unknown as VehicleSearchRepository,
    );

    const result = await service.searchVehicles("fleet-1", baseFilters, 0, 20);

    expect(result.items).toEqual([]);
    expect(repo.searchByFleet).not.toHaveBeenCalled();
  });

  it("normalise la query et délègue au repository", async () => {
    const repo = createRepositoryMock();
    repo.searchByFleet.mockResolvedValue({
      items: [],
      totalCount: 0,
      hasMore: false,
      page: 0,
      pageSize: 20,
    });
    const service = new VehicleSearchService(
      repo as unknown as VehicleSearchRepository,
    );

    await service.searchVehicles(
      "fleet-1",
      {
        ...baseFilters,
        query: "  TOYOTA  ",
      },
      0,
      20,
    );

    expect(repo.searchByFleet).toHaveBeenCalledWith(
      "fleet-1",
      expect.objectContaining({ query: "TOYOTA" }),
      0,
      20,
    );
  });

  it("renvoie un message utilisateur en cas d'erreur technique", async () => {
    const repo = createRepositoryMock();
    repo.searchByFleet.mockRejectedValue(new Error("db down"));
    const service = new VehicleSearchService(
      repo as unknown as VehicleSearchRepository,
    );

    await expect(
      service.searchVehicles("fleet-1", {
        ...baseFilters,
        query: "AB",
      }, 0, 20),
    ).rejects.toThrow("Impossible d'effectuer la recherche des véhicules.");
  });
});
