import { beforeEach, describe, expect, it } from "vitest";
import {
  getVehicleListPlaceholder,
  saveVehicleListSnapshot,
  vehicleListFiltersKey,
} from "@/lib/storage/flotteEsambaLocalCache";
import { storageRemoveByPrefix } from "@/lib/storage/localStorageService";
import { STORAGE_PREFIX } from "@/lib/storage/storageKeys";
import type { VehicleListItemDto } from "@/repositories/vehicle.repository";

const sampleItem = (id: string): VehicleListItemDto =>
  ({
    id,
    fleet_id: "f1",
    registration: "AB-123",
    brand: "X",
    model: "Y",
    year: 2020,
    current_km: 1000,
    status: "ok",
    blocked_reason: null,
    created_at: new Date().toISOString(),
    next_maintenance_at: null,
  }) as VehicleListItemDto;

describe("cache local liste véhicules", () => {
  beforeEach(() => {
    storageRemoveByPrefix(STORAGE_PREFIX);
  });

  it("persiste et relit les mêmes filtres", () => {
    const filters = { fleet_id: "f1", status: undefined as string | undefined, search: undefined };
    const items = [sampleItem("v1")];
    saveVehicleListSnapshot(filters, items);
    expect(getVehicleListPlaceholder(filters)).toEqual(items);
  });

  it("ne retourne pas de données si les filtres diffèrent", () => {
    saveVehicleListSnapshot({ fleet_id: "f1" }, [sampleItem("v1")]);
    expect(getVehicleListPlaceholder({ fleet_id: "f1", search: "foo" })).toBeUndefined();
  });

  it("vehicleListFiltersKey est stable", () => {
    expect(vehicleListFiltersKey({ fleet_id: "a" })).toBe(vehicleListFiltersKey({ fleet_id: "a" }));
  });
});
