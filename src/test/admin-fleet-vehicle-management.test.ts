import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260904141500_registration_same_fleet_reuse_and_admin_fleet_management.sql",
  "utf8",
);

describe("admin fleet vehicle management", () => {
  it("autorise la réutilisation d'une plaque supprimée dans la même flotte", () => {
    expect(migration).toContain("v_registered_fleet_id = new.fleet_id");
    expect(migration).toContain("v_released_at is not null or v_registered_fleet_id = new.fleet_id");
    expect(migration).toContain("vehicle_registration_locked_to_other_fleet");
  });

  it("permet à un admin de libérer explicitement une réservation", () => {
    expect(migration).toContain("admin_release_vehicle_registration");
    expect(migration).toContain("released_at = now()");
    expect(migration).toContain("released_by = auth.uid()");
    expect(migration).toContain("public.is_platform_admin()");
  });

  it("expose les opérations de gestion des flottes et véhicules", () => {
    expect(migration).toContain("admin_list_fleet_vehicles");
    expect(migration).toContain("admin_list_registration_locks");
    expect(migration).toContain("admin_delete_vehicle");
    expect(migration).toContain("registration_reserved_for_fleet");
  });
});
