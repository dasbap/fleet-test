import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type VercelRoute = {
  source: string;
  destination: string;
  permanent?: boolean;
};

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  redirects?: VercelRoute[];
  rewrites?: VercelRoute[];
};

describe("Vercel public SPA routes", () => {
  it("ne redirige pas les pages publiques servies par l'app vers le hub marketing", () => {
    const appPublicRoutes = [
      "/faq",
      "/pricing",
      "/contact",
      "/modules",
      "/fonctionnalites",
      "/fonctionnalites/piloter-flotte",
    ];

    const redirects = config.redirects ?? [];
    for (const path of appPublicRoutes) {
      const matchingRedirect = redirects.find((route) => {
        const sourcePrefix = route.source.replace("/:path*", "");
        return path === sourcePrefix || path.startsWith(`${sourcePrefix}/`);
      });

      expect(matchingRedirect?.destination ?? "").not.toContain(
        "marketing.e-samba.com"
      );
    }
  });

  it("conserve le fallback SPA sans intercepter les fonctions API ni les fichiers statiques", () => {
    const rewrites = config.rewrites ?? [];
    const apiRewrites = rewrites.filter((route) => route.source.startsWith("/api/"));
    const spaFallback = rewrites.find((route) => route.destination === "/index.html" && route.source.startsWith("/((?!api/)"));

    expect(spaFallback).toEqual({
      source: "/((?!api/)(?!.*\\.[^/]+$).*)",
      destination: "/index.html",
    });
    expect(spaFallback?.source).toContain("(?!.*\\.[^/]+$)");
    expect(apiRewrites.length).toBeGreaterThan(0);
    expect(apiRewrites.every((route) => route.destination.startsWith("/api/"))).toBe(true);
    expect(apiRewrites.every((route) => route.destination !== "/index.html")).toBe(true);
    expect(apiRewrites).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/api/:path*" }),
      ]),
    );
  });
});
