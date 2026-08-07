import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("PWA service worker update", () => {
  it("activates a newly deployed service worker without waiting for a hard refresh", () => {
    const pwaSource = readFileSync("src/pwa.ts", "utf8");
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(pwaSource).toContain("updateSW(true)");
    expect(viteConfig).toContain('registerType: "prompt"');
    expect(viteConfig).toContain("skipWaiting: true");
    expect(viteConfig).toContain("clientsClaim: true");
  });

  it("prevents Vercel from caching the SPA shell and service worker metadata", () => {
    const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      headers?: Array<{
        source: string;
        headers?: Array<{
          key: string;
          value: string;
        }>;
      }>;
    };

    const noStoreSources = (vercelConfig.headers ?? [])
      .filter((entry) =>
        entry.headers?.some(
          (header) =>
            header.key === "Cache-Control" && header.value.includes("no-store")
        )
      )
      .map((entry) => entry.source);

    expect(noStoreSources).toContain("/index.html");
    expect(noStoreSources).toContain("/sw.js");
    expect(noStoreSources).toContain("/manifest.webmanifest");

    expect(
      noStoreSources.some((source) => source === "/workbox-:path*.js")
    ).toBe(true);
  });
});
