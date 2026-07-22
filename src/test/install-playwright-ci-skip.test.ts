import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("install-playwright CI behavior", () => {
  it("skips browser downloads during npm ci on GitHub runners", () => {
    const script = readFileSync("scripts/install-playwright.mjs", "utf8");

    expect(script).toContain("process.env.CI");
    expect(script).toContain("process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD");
    expect(script.indexOf("process.env.CI")).toBeLessThan(
      script.indexOf("npx playwright install")
    );
  });
});
