import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("pro plan catalog migration", () => {
  it("ensures the pro plan exists for accepted account onboarding", () => {
    const sql = readFileSync(
      "supabase/migrations/20260804103000_ensure_pro_plan_for_demo_default.sql",
      "utf8",
    );

    expect(sql).toContain("insert into public.plans");
    expect(sql).toContain("'pro'");
    expect(sql).toContain("max_vehicles");
    expect(sql).toContain("on conflict (code) do update");
    expect(sql).toContain("notify pgrst, 'reload schema'");
  });
});
