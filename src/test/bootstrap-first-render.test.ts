import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("bootstrap first render", () => {
  it("monte React sans attendre le chargement reseau i18n", () => {
    const source = readFileSync("src/main.tsx", "utf8");
    const i18nAwaitIndex = source.indexOf("await withTimeout(\n      i18nReady");
    const renderIndex = source.indexOf("createRoot(rootEl).render");

    expect(renderIndex).toBeGreaterThan(-1);
    expect(i18nAwaitIndex === -1 || i18nAwaitIndex > renderIndex).toBe(true);
  });
});
