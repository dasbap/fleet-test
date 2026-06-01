import { describe, it, expect } from "vitest";
import { FONCTIONNALITES } from "@/data/marketing/fonctionnalites";
import { MODULES } from "@/data/marketing/modules";
import { PUBLIC_NAV_LINKS, PUBLIC_DEMO_HREF } from "@/data/marketing/public-nav";
import { getMarketingUrl } from "@/lib/marketing-url";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const MARKETING_PATH_PATTERN = /^\/(guides|fonctionnalites|solutions)\//;

describe("données marketing publiques", () => {
  it("expose des guidePath relatifs valides pour les fonctionnalités", () => {
    for (const item of FONCTIONNALITES) {
      expect(item.guidePath.startsWith("/")).toBe(true);
      expect(getMarketingUrl(item.guidePath)).toMatch(/^https:\/\//);
    }
  });

  it("expose des guidePath relatifs valides pour les modules", () => {
    for (const item of MODULES) {
      expect(item.guidePath.startsWith("/")).toBe(true);
      expect(getMarketingUrl(item.guidePath)).toMatch(/^https:\/\//);
    }
  });

  it("pointe les deep-links vers le hub marketing (Option A)", () => {
    const allPaths = [
      ...FONCTIONNALITES.map((f) => f.guidePath),
      ...MODULES.map((m) => m.guidePath),
    ];
    for (const path of allPaths) {
      expect(
        path.startsWith("/guides/") ||
          path.startsWith("/fonctionnalites/") ||
          path.startsWith("/solutions/"),
      ).toBe(true);
      expect(MARKETING_PATH_PATTERN.test(path)).toBe(true);
    }
  });

  it("n'inclut pas Guides dans la navbar (hub marketing externe)", () => {
    const names = PUBLIC_NAV_LINKS.map((l) => l.name);
    expect(names).not.toContain("Guides");
    expect(PUBLIC_NAV_LINKS.some((l) => "href" in l && l.href?.includes("/guides"))).toBe(false);
  });

  it("utilise des routes www pour fonctionnalités, modules, tarifs, faq et contact", () => {
    const internal = PUBLIC_NAV_LINKS.filter(
      (l): l is Extract<typeof l, { to: string }> => !("external" in l && l.external),
    );
    const paths = internal.map((l) => l.to);
    expect(paths).toContain("/fonctionnalites");
    expect(paths).toContain("/modules");
    expect(paths).toContain("/pricing");
    expect(paths).toContain("/faq");
    expect(paths).toContain("/contact");
  });

  it("pointe le CTA démo vers /contact#demo", () => {
    expect(PUBLIC_DEMO_HREF).toBe(`${ROUTE_PATHS.contact}#demo`);
  });
});
