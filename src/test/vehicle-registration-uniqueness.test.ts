import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapSupabaseErrorToFrench } from "@/lib/mapSupabaseError";

describe("vehicle registration uniqueness", () => {
  it("enforces a normalized unique registration in the database migration", () => {
    const migration = readFileSync(
      "supabase/migrations/20260828142500_vehicle_registration_unique_and_public_help_read.sql",
      "utf8",
    );

    expect(migration).toContain("vehicules_registration_normalized_unique_idx");
    expect(migration).toContain("upper(regexp_replace(trim(registration)");
    expect(migration).toContain("create unique index");
  });

  it("shows a clear user message for duplicate plates", () => {
    expect(
      mapSupabaseErrorToFrench(
        'duplicate key value violates unique constraint "vehicules_registration_normalized_unique_idx"',
      ),
    ).toBe("Cette plaque d'immatriculation est déjà utilisée par un autre véhicule.");
  });
});
