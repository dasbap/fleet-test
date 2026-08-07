import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("abonnements cancellation columns migration", () => {
  it("adds cancellation columns required by admin plan assignment", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804110000_ensure_abonnements_cancel_columns.sql",
      "utf8",
    );

    expect(sql).toContain("alter table public.abonnements");
    expect(sql).toContain("add column if not exists cancelled_at");
    expect(sql).toContain("add column if not exists cancelled_by");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
