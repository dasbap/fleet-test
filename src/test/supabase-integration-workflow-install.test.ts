import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("supabase integration workflow dependency install", () => {
  it("keeps npm install bounded and avoids postinstall downloads", () => {
    const workflow = readFileSync(".github/workflows/supabase-integration.yml", "utf8");

    expect(workflow).toContain("timeout-minutes: 8");
    expect(workflow).toContain("node scripts/ci-install.mjs");
    expect(workflow).not.toMatch(/\brun:\s+npm ci\s*$/m);
  });
});
