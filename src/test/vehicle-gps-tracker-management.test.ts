import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("vehicle GPS tracker management", () => {
  it("permet a l'organisateur et au super admin de gerer un traceur sans fonction Vercel", () => {
    const migration = read("supabase/migrations/20260910115500_vehicle_gps_tracker_management.sql");

    expect(migration).toContain("create table if not exists public.vehicle_gps_trackers");
    expect(migration).toContain("public.is_platform_super_admin()");
    expect(migration).toContain("fa.role::text = 'organizer'");
    expect(migration).toContain("upsert_vehicle_gps_tracker");
    expect(migration).toContain("remove_vehicle_gps_tracker");
    expect(migration).toContain("gps_tracker_already_assigned");
    expect(migration).toContain("revoke all on table public.vehicle_gps_trackers from public, anon, authenticated");
  });

  it("expose la configuration GPS dans la flotte uniquement aux roles autorises", () => {
    const screen = read("src/features/fleet/screens/FleetListScreen.tsx");
    const section = read("src/components/vehicles/VehicleGpsManagementSection.tsx");
    const dialog = read("src/components/vehicles/VehicleGpsTrackerDialog.tsx");
    const service = read("src/services/vehicle-gps-tracker.service.ts");

    expect(screen).toContain("VehicleGpsManagementSection");
    expect(section).toContain('rbac.fleetRole === "organizer" || isSuperAdmin');
    expect(section).toContain("Configurer le GPS");
    expect(dialog).toContain("Identifiant du traceur / IMEI");
    expect(dialog).toContain("Aucun administrateur n'est requis");
    expect(service).toContain('supabase.rpc("upsert_vehicle_gps_tracker"');
    expect(service).toContain('supabase.rpc("remove_vehicle_gps_tracker"');
  });

  it("n'ajoute aucune fonction Vercel pour le GPS", () => {
    const vercel = read("vercel.json");
    expect(vercel).not.toContain("gps-tracker");
    expect(vercel).not.toContain("vehicle-gps");
  });
});
