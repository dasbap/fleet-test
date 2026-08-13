import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PWA service worker update", () => {
  it("activates a newly deployed service worker without waiting for a hard refresh", () => {
    const pwaSource = readFileSync("src/pwa.ts", "utf8");
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(pwaSource).toContain("updateSW(true)");
    expect(viteConfig).toContain('registerType: "autoUpdate"');
    expect(viteConfig).not.toContain('registerType: "prompt"');
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

  it("does not serve the SPA fallback for marketing routes redirected cross-origin", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain("/^\\/blog(?:\\/|$)/");
    expect(viteConfig).toContain("/^\\/guides(?:\\/|$)/");
    expect(viteConfig).toContain("/^\\/fonctionnalites(?:\\/|$)/");
    expect(viteConfig).toContain("/^\\/solutions(?:\\/|$)/");
  });

  it("does not cache marketing redirects that resolve cross-origin", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain('cacheName: "esamba-marketing-redirects"');
    expect(viteConfig).toContain('handler: "NetworkOnly"');
  });

  it("does not register the service worker on protected Vercel deployments", () => {
    const mainSource = readFileSync("src/main.tsx", "utf8");
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    const pwaBlock = mainSource.slice(mainSource.indexOf("// PWA"));

    expect(viteConfig).toContain('process.env.VERCEL_ENV === "preview"');
    expect(viteConfig).toContain(
      'process.env.ESAMBA_DISABLE_PWA === "true"'
    );
    expect(viteConfig).toContain(
      "mode !== \"capacitor\" && !shouldDisablePwa"
    );
    expect(viteConfig).toContain("shouldEnablePwa &&");
    expect(viteConfig).toContain('"@/pwa": path.resolve');
    expect(viteConfig).toContain("./src/pwa.noop.ts");
    expect(viteConfig).toContain("pwaManifestGuardPlugin(shouldDisablePwa)");
    expect(viteConfig).toContain('rel="manifest"');
    expect(viteConfig).toContain("manifest.webmanifest");
    expect(mainSource).toContain("isProtectedVercelPreview");
    expect(pwaBlock).toContain("!isProtectedVercelPreview()");
  });
});
