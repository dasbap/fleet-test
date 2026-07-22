import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { selectMigrationFiles } from "../../scripts/select-supabase-migrations.mjs";

describe("selectMigrationFiles", () => {
  it("reads the runtime migration set from the baseline delta list", () => {
    const files = selectMigrationFiles("runtime");

    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain(
      "supabase/migrations/20260706123000_restore_admin_user_provisioning_runtime.sql",
    );
    expect(files).toContain(
      "supabase/migrations/20260722171000_demo_admin_lifecycle_actions.sql",
    );
    expect(files).toContain(
      "supabase/migrations/20260722165000_stop_global_demo_fleet_assignment.sql",
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

  it("casts scalar has_role role literals in runtime migrations", () => {
    const offenders = selectMigrationFiles("runtime").flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const matches =
        source.match(/has_role\(\s*[^,\n)]+,\s*'(manager|organizer|mechanic|driver)'(?!::)/g) ??
        [];

      return matches.map((match) => `${file}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });

  it("drops renamed runtime functions before recreating them", () => {
    const source = readFileSync(
      "supabase/migrations/20250223120000_fix_functions_search_path.sql",
      "utf8",
    );

    expect(source).toContain(
      "DROP FUNCTION IF EXISTS public.affecter_vehicule(uuid, uuid, uuid, timestamptz);",
    );
    expect(source).toContain(
      "DROP FUNCTION IF EXISTS public.fermer_creneau(uuid, int, int, text, text, text);",
    );
    expect(source).toContain(
      "DROP FUNCTION IF EXISTS public.rechercher_utilisateurs(text, int);",
    );
  });
});
