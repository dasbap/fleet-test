import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("PWA service worker update", () => {
  it("does not force an automatic full page reload when a new service worker is available", () => {
    const pwaSource = readFileSync("src/pwa.ts", "utf8");
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(pwaSource).not.toContain("updateSW(true)");
    expect(viteConfig).toContain('registerType: "prompt"');
    expect(viteConfig).toContain("skipWaiting: false");
    expect(viteConfig).toContain("clientsClaim: false");
  });
});
