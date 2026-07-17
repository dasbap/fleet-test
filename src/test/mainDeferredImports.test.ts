import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("main bootstrap deferred imports", () => {
  it("ne charge pas analytics ou PWA sur le creneau fixe de 2-3 secondes", () => {
    const source = readFileSync("src/main.tsx", "utf8");

    expect(source).toContain("scheduleDeferredMainThreadWork");
    expect(source).toContain("delayMs: 8_000");
    expect(source).toContain("delayMs: 10_000");
    expect(source).not.toContain("}, 3_000)");
    expect(source).not.toContain("}, 2_000)");
  });
});
