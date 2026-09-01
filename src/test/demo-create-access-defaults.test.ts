import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("demo access creation defaults", () => {
  it("requests a one-month demo by default from the public demo BFF", () => {
    const source = readFileSync("api/demo/create-access.ts", "utf8");

    expect(source).toContain("trial_days: body.trial_days ?? 31");
  });

  it("requests a one-month demo by default from the admin prospect BFF", () => {
    const source = readFileSync("api/admin/create-prospect.ts", "utf8");

    expect(source).toMatch(/trial_days:\s*body\.trial_days \?\? 31/);
  });


  it("borne l'appel upstream de la route admin prospect", () => {
    const source = readFileSync("api/admin/create-prospect.ts", "utf8");

    expect(source).toContain("fetchWithTimeout");
    expect(source).toContain("upstream_timeout");
  });
  it("defaults the edge function to one month when called directly", () => {
    const source = readFileSync("supabase/functions/create-prospect-account/index.ts", "utf8");

    expect(source).toContain("const trialDays = Number(body.trial_days ?? 31)");
  });
});
