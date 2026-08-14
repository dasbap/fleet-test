import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const panelSource = () =>
  readFileSync("src/components/admin/AllAccountsPanel.tsx", "utf8");

const migrationSource = () =>
  readFileSync(
    "supabase/migrations/20260811113000_hide_integration_test_accounts_from_admin.sql",
    "utf8",
  );

describe("admin all accounts integration fixtures filter", () => {
  it("filters transient integration auth accounts in the UI parser", () => {
    const source = panelSource();

    expect(source).toContain("isIntegrationTestAccount");
    expect(source).toContain("integration.tests@esamba.test");
    expect(source).toContain("^integration-[a-z0-9-]+@esamba\\.test$");
    expect(source).toContain("integration test user");
  });

  it("filters transient integration auth accounts in the admin RPC", () => {
    const migration = migrationSource();

    expect(migration).toContain("admin_list_all_accounts");
    expect(migration).toContain("like 'integration-%@esamba.test'");
    expect(migration).toContain("= 'integration.tests@esamba.test'");
    expect(migration).toContain("raw_user_meta_data ? 'test_run_id'");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });
});
