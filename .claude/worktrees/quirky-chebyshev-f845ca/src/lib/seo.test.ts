import { describe, expect, it } from "vitest";
import {
  getCanonicalUrlFromPath,
  resolveSeoRouteKey,
  SEO_BY_ROUTE_KEY,
  SEO_ROUTE_KEYS,
} from "@/lib/seo";

describe("seo route key resolution", () => {
  it("verifie la coherence canonicalPath -> resolveSeoRouteKey pour toutes les routes", () => {
    Object.entries(SEO_BY_ROUTE_KEY).forEach(([routeKey, config]) => {
      if (routeKey === SEO_ROUTE_KEYS.notFound) return;

      expect(resolveSeoRouteKey(config.canonicalPath)).toBe(routeKey);
    });
  });

  it("resout une route connue", () => {
    expect(resolveSeoRouteKey("/dashboard/vehicles")).toBe(
      SEO_ROUTE_KEYS.vehicles
    );
  });

  it("normalise le trailing slash", () => {
    expect(resolveSeoRouteKey("/auth/")).toBe(SEO_ROUTE_KEYS.auth);
  });

  it("retourne notFound pour une route inconnue", () => {
    expect(resolveSeoRouteKey("/route-inconnue")).toBe(SEO_ROUTE_KEYS.notFound);
  });
});

describe("seo canonical url", () => {
  it("genere l'URL canonique pour la racine", () => {
    expect(getCanonicalUrlFromPath("/")).toBe("https://www.e-samba.com/");
  });

  it("genere l'URL canonique pour une route dashboard", () => {
    expect(getCanonicalUrlFromPath("/dashboard/history")).toBe(
      "https://www.e-samba.com/dashboard/history"
    );
  });

  it("normalise les slashs en entree", () => {
    expect(getCanonicalUrlFromPath("dashboard/history/")).toBe(
      "https://www.e-samba.com/dashboard/history"
    );
  });
});
