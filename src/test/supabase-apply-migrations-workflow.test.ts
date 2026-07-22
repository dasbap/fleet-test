import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workflow = () =>
  readFileSync(".github/workflows/supabase-apply-migrations.yml", "utf8");

describe("supabase apply migrations workflow", () => {
  it("runs automatically on production branch migration pushes", () => {
    const source = workflow();

    expect(source).toContain("push:");
    expect(source).toContain("branches: [main, master, PRINCIPALE, admin-panel]");
    expect(source).toContain("supabase/migrations/**");
    expect(source).toContain("supabase/baseline/**");
  });

  it("uses safe defaults when the event is push and workflow_dispatch inputs are absent", () => {
    const source = workflow();

    expect(source).toContain("MIGRATION_SET: ${{ inputs.migration_set || 'runtime' }}");
    expect(source).toContain("if: ${{ github.event_name == 'push' || inputs.mode == 'apply' }}");
    expect(source).toContain("if: ${{ github.event_name == 'workflow_dispatch' && inputs.mode == 'dry-run' }}");
  });

  it("uses the pooler resolver and disables npm postinstall scripts for the production runner", () => {
    const source = workflow();

    expect(source).toContain("runs-on: [self-hosted, Linux, X64]");
    expect(source).toContain("npm --prefix .ci-sql-runner install --ignore-scripts --no-package-lock --no-audit --no-fund pg@8.18.0");
    expect(source).toContain("SQL_RUNNER_PG_MODULE: .ci-sql-runner/node_modules/pg/lib/index.js");
    expect(source).toContain('SKIP_DIRECT_DATA_MUTATIONS: "1"');
    expect(source).not.toContain("npm ci --ignore-scripts --omit=dev");
    expect(source).not.toContain("npm ci --ignore-scripts --include=dev");
    expect(source).toContain('db_url="$(node scripts/resolve-supabase-db-url.mjs)"');
    expect(source).toContain('export DATABASE_URL="$db_url"');
    expect(source).toContain('export PGSSLMODE="no-verify"');
    expect(source).toContain('node scripts/apply-sql-file.mjs "${migration_files[@]}"');
    expect(source).not.toContain("supabase db query --db-url");
  });
});
