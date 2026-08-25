import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260820121000_restrict_access_code_generator.sql",
  "utf8",
);

describe("access-code generator security", () => {
  it("reserves direct generator execution to service_role", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toContain("TO authenticated");
  });
});
