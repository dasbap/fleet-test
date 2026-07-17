import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("route chunk preloading performance", () => {
  it("ne lance pas tous les imports lazy dashboard dans une seule tranche idle", () => {
    const source = readFileSync("src/app/routes/preloadRouteChunks.ts", "utf8");

    expect(source).toContain("runPreloadTasksInIdleSlices");
    expect(source).not.toContain("tasks.forEach((task) => void task())");
  });
});
