import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = () =>
  readFileSync(".github/workflows/supabase-apply-migrations.yml", "utf8");

describe("supabase apply migrations workflow", () => {
  it("runs automatically on production branch migration pushes", () => {
    const source = workflow();

    expect(source).toContain("push:");
    expect(source).toContain("branches:");
    expect(source).toContain("- main");
    expect(source).not.toContain("- admin-panel");
    expect(source).toContain("supabase/migrations/**");
    expect(source).toContain("supabase/baseline/**");
  });

  it("uses safe defaults when the event is push and workflow_dispatch inputs are absent", () => {
    const source = workflow();

    expect(source).toContain(
      "MIGRATION_SET: ${{ inputs.migration_set || 'runtime' }}"
    );
    expect(source).toContain("default: dry-run");
    expect(source).toContain("default: runtime");
    expect(source).toContain(
      "if: ${{ (github.event_name == 'push' && github.ref == 'refs/heads/main') || (github.event_name == 'workflow_dispatch' && inputs.mode == 'apply') }}"
    );
    expect(source).toContain("if: ${{ inputs.mode == 'dry-run' }}");
  });

  it("uses the bounded CI installer and applies migrations through the SQL runner", () => {
    const source = workflow();

    expect(source).toContain("runs-on: [self-hosted, Linux, X64]");
    expect(source).toContain("node scripts/ci-install.mjs");
    expect(source).not.toContain("npm ci --ignore-scripts --omit=dev");
    expect(source).not.toContain("npm ci --ignore-scripts --include=dev");
    expect(source).toContain("node scripts/select-supabase-migrations.mjs");
    expect(source).toContain('SKIP_DIRECT_DATA_MUTATIONS: "1"');
    expect(source).toContain(
      'node scripts/apply-sql-file.mjs "${migration_files[@]}"'
    );
    expect(source).toContain(
      "node scripts/apply-sql-file.mjs supabase/tests/04_post_migration_objects.sql"
    );
    expect(source).not.toContain("supabase db query --db-url");
  });
});
