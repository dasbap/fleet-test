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

  it("n'expose pas de liens menu dans la navbar publique", () => {
    expect(PUBLIC_NAV_LINKS).toHaveLength(0);
  });

  it("pointe le CTA démo vers /contact#demo", () => {
    expect(PUBLIC_DEMO_HREF).toBe(`${ROUTE_PATHS.contact}#demo`);
  });
});
