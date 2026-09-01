import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260825120500_ensure_paiements_provider_reference.sql",
  "utf8",
);
const compactMigration = migration.replace(/\s+/g, " ");

describe("paiements provider_reference migration", () => {
  it("restores the provider reference column and idempotence index", () => {
    expect(compactMigration).toContain(
      "ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS provider_reference text NULL",
    );
    expect(migration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS paiements_provider_reference_unique");
    expect(migration).toContain("WHERE provider_reference IS NOT NULL");
    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});