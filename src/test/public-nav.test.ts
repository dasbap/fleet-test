import { describe, it, expect } from "vitest";
import { FONCTIONNALITES } from "@/data/marketing/fonctionnalites";
import { MODULES } from "@/data/marketing/modules";
import {
  AUTH_NAV,
  buildMailtoHref,
  buildSupportMailto,
  CONTACT,
  DEPARTMENT_EMAILS,
  DASHBOARD_NAV,
  FOOTER_SUPPORT_LINKS,
  isDashboardNavActive,
  isPublicNavActive,
  PRIVACY,
  PUBLIC_DEMO_HREF,
  PUBLIC_NAV,
  PUBLIC_NAV_LINKS,
  SOCIAL,
  SUPPORT,
} from "@/config/navigation";
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

  it("inclut Guides dans la navbar publique", () => {
    const labels = PUBLIC_NAV.map((l) => l.label);
    expect(labels).toContain("Guides");
    expect(PUBLIC_NAV.some((l) => l.href === ROUTE_PATHS.help)).toBe(true);
  });

  it("utilise des ancres landing pour fonctionnalités et modules", () => {
    expect(PUBLIC_NAV.find((l) => l.label === "Fonctionnalités")?.href).toBe("/#features");
    expect(PUBLIC_NAV.find((l) => l.label === "Modules")?.href).toBe("/#modules");
  });

  it("utilise des routes www pour tarifs, faq, contact et guides", () => {
    const hrefs = PUBLIC_NAV.filter((l) => l.type === "route").map((l) => l.href);
    expect(hrefs).toContain("/pricing");
    expect(hrefs).toContain("/faq");
    expect(hrefs).toContain("/contact");
    expect(hrefs).toContain("/help");
  });

  it("conserve la compatibilité PUBLIC_NAV_LINKS", () => {
    const names = PUBLIC_NAV_LINKS.map((l) => l.name);
    expect(names).toContain("Guides");
    expect(names).toContain("Fonctionnalités");
  });

  it("pointe le CTA démo vers /contact#demo", () => {
    expect(PUBLIC_DEMO_HREF).toBe(`${ROUTE_PATHS.contact}#demo`);
    expect(AUTH_NAV.find((item) => item.label === "Demander une démo")?.href).toBe(
      PUBLIC_DEMO_HREF,
    );
  });

  it("centralise le lien WhatsApp", () => {
    expect(SOCIAL.whatsapp).toMatch(/^https:\/\/wa\.me\//);
    expect(SOCIAL.whatsappNumber.length).toBeGreaterThan(0);
  });

  it("détecte l'état actif des liens de navigation", () => {
    const pricing = PUBLIC_NAV.find((item) => item.label === "Tarifs")!;
    expect(isPublicNavActive(pricing, "/pricing", "")).toBe(true);
    expect(isPublicNavActive(pricing, "/contact", "")).toBe(false);

    const features = PUBLIC_NAV.find((item) => item.label === "Fonctionnalités")!;
    expect(isPublicNavActive(features, "/", "#features")).toBe(true);
    expect(isPublicNavActive(features, "/", "")).toBe(false);
  });

  it("expose des liens support footer sans pages verrouillées", () => {
    const paths = FOOTER_SUPPORT_LINKS.map((link) => link.to);
    expect(paths).not.toContain("/documentation");
    expect(paths).not.toContain("/api");
    expect(paths).toContain("/help");
  });

  it("détecte l'état actif sidebar avec sous-routes", () => {
    expect(
      isDashboardNavActive("/dashboard/vehicles/abc-123", ROUTE_PATHS.dashboardVehicles),
    ).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles", ROUTE_PATHS.dashboardVehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard/drivers", ROUTE_PATHS.dashboardVehicles)).toBe(false);
    expect(isDashboardNavActive("/dashboard/vehicles", ROUTE_PATHS.dashboard)).toBe(false);
  });

  it("expose DASHBOARD_NAV pour tous les rôles métier", () => {
    expect(DASHBOARD_NAV.organizer.length).toBeGreaterThan(10);
    expect(DASHBOARD_NAV.manager.some((item) => item.label === "Chauffeurs")).toBe(true);
    expect(DASHBOARD_NAV.driver.every((item) => item.href.startsWith("/dashboard"))).toBe(true);
    expect(DASHBOARD_NAV.mechanic.some((item) => item.label === "Historique")).toBe(true);
  });

  it("centralise les coordonnées contact publiques", () => {
    expect(CONTACT.email).toContain("@");
    expect(CONTACT.telHref).toMatch(/^tel:/);
    expect(CONTACT.phoneDisplay.length).toBeGreaterThan(8);
  });

  it("centralise l'email support produit", () => {
    expect(SUPPORT.email).toContain("@");
    expect(SUPPORT.mailtoHref).toMatch(/^mailto:/);
  });

  it("centralise l'email confidentialité", () => {
    expect(PRIVACY.email).toContain("@");
    expect(PRIVACY.mailtoHref).toMatch(/^mailto:/);
  });

  it("centralise les emails département", () => {
    expect(Object.values(DEPARTMENT_EMAILS).every((e) => e.includes("@"))).toBe(true);
  });

  it("construit des liens mailto avec sujet et corps", () => {
    const href = buildSupportMailto("Test sujet", "Corps du message");
    expect(href).toContain(SUPPORT.email);
    expect(href).toContain("subject=Test");
    expect(href).toContain("body=Corps");
    expect(buildMailtoHref(CONTACT.email)).toBe(CONTACT.mailtoHref);
  });
});
