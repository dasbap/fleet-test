import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260904133000_vehicle_registration_and_admin_creation.sql",
  "utf8",
);

describe("vehicle registration database invariants", () => {
  it("rend l'immatriculation unique globalement apres normalisation", () => {
    expect(migration).toContain("normalize_vehicle_registration");
    expect(migration).toContain("vehicules_registration_global_unique_idx");
    expect(migration).toContain(
      "on public.vehicules (public.normalize_vehicle_registration(registration))",
    );
  });

  it("reserve aussi les plaques apres suppression", () => {
    const registryMigration = readFileSync(
      "supabase/migrations/20260904135500_vehicle_registration_permanent_registry.sql",
      "utf8",
    );
    expect(registryMigration).toContain("vehicle_registration_registry");
    expect(registryMigration).toContain("first_vehicle_id");
    expect(registryMigration).toContain("vehicle_registration_already_used");
  });

  it("valide l'immatriculation selon le pays de la flotte", () => {
    expect(migration).toContain("validate_vehicle_registration");
    expect(migration).toContain("o.country_code");
    expect(migration).toContain("vehicle_registration_invalid_length");
    expect(migration).toContain("vehicle_registration_invalid_characters");
  });

  it("autorise le bypass admin des limites sans bypasser la plaque", () => {
    expect(migration).toContain("app.admin_vehicle_bypass");
    expect(migration).toContain("public.is_platform_admin()");
    expect(migration).toContain("admin_create_vehicle");
    expect(migration).toContain("vehicle_registration_already_used");
  });
});
