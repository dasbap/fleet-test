import { describe, expect, it } from "vitest";

import { selectMigrationFiles } from "../../scripts/select-supabase-migrations.mjs";

describe("selectMigrationFiles", () => {
  it("reads the runtime migration set from package scripts", () => {
    const files = selectMigrationFiles("runtime");

    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain(
      "supabase/migrations/20260706123000_restore_admin_user_provisioning_runtime.sql",
    );
    expect(new Set(files).size).toBe(files.length);
    expect(files.every((file) => file.startsWith("supabase/migrations/"))).toBe(
      true,
    );
  });

  it("returns every migration in chronological order", () => {
    const files = selectMigrationFiles("all");

    expect(files.length).toBeGreaterThan(selectMigrationFiles("runtime").length);
    expect(files).toEqual([...files].sort());
    expect(files.every((file) => file.endsWith(".sql"))).toBe(true);
  });
});
