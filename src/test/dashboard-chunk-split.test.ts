import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("dashboard route chunks", () => {
  it("ne force pas toutes les pages dashboard lazy dans un seul chunk initial", () => {
    const source = readFileSync("vite.config.ts", "utf8");

    expect(source).not.toMatch(/return\s+["']chunk-dashboard["']/);
    expect(source).not.toContain("/src/pages/(Drivers|Maintenance|Incidents|Reports|Settings");
  });
});
