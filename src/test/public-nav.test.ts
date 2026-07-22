import { describe, expect, it } from "vitest";
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
const findPublicNavByHref = (href: string) => PUBLIC_NAV.find((item) => item.href === href);

describe("donnees marketing publiques", () => {
  it("expose des guidePath relatifs valides pour les fonctionnalites", () => {
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

  it("pointe les deep-links vers le hub marketing", () => {
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

  it("n'affiche plus Guides dans la navbar publique", () => {
    expect(PUBLIC_NAV.some((l) => l.label === "Guides")).toBe(false);
  });

  it("n'utilise plus d'ancres dans la navbar publique", () => {
    expect(PUBLIC_NAV.every((l) => !l.href.includes("#"))).toBe(true);
    expect(findPublicNavByHref(ROUTE_PATHS.fonctionnalites)?.type).toBe("route");
    expect(findPublicNavByHref(ROUTE_PATHS.modules)?.type).toBe("route");
  });

  it("utilise des routes www pour tarifs, faq et contact", () => {
    const hrefs = PUBLIC_NAV.filter((l) => l.type === "route").map((l) => l.href);
    expect(hrefs).toContain("/pricing");
    expect(hrefs).toContain("/faq");
    expect(hrefs).toContain("/contact");
  });

  it("conserve la compatibilite PUBLIC_NAV_LINKS", () => {
    const names = PUBLIC_NAV_LINKS.map((l) => l.name);
    expect(names).not.toContain("Guides");
    expect(PUBLIC_NAV_LINKS.some((l) => l.to === ROUTE_PATHS.fonctionnalites)).toBe(true);
  });

  it("pointe le CTA demo vers /contact sans ancre", () => {
    expect(PUBLIC_DEMO_HREF).toBe(ROUTE_PATHS.contact);
    expect(AUTH_NAV.some((item) => item.href === PUBLIC_DEMO_HREF)).toBe(true);
    expect(AUTH_NAV.every((item) => !item.href.includes("#"))).toBe(true);
  });

  it("ne publie plus le CTA Demander un acces dans la navbar", () => {
    expect(AUTH_NAV.some((item) => item.label === "Demander un acces")).toBe(false);
  });

  it("centralise le lien WhatsApp", () => {
    expect(SOCIAL.whatsapp).toMatch(/^https:\/\/wa\.me\//);
    expect(SOCIAL.whatsappNumber.length).toBeGreaterThan(0);
  });

  it("detecte l'etat actif des liens de navigation", () => {
    const pricing = PUBLIC_NAV.find((item) => item.label === "Tarifs")!;
    expect(isPublicNavActive(pricing, "/pricing", "")).toBe(true);
    expect(isPublicNavActive(pricing, "/contact", "")).toBe(false);

    const features = findPublicNavByHref(ROUTE_PATHS.fonctionnalites)!;
    expect(isPublicNavActive(features, ROUTE_PATHS.fonctionnalites, "")).toBe(true);
    expect(isPublicNavActive(features, "/", "")).toBe(false);
  });

  it("expose des liens support footer sans pages verrouillees", () => {
    const paths = FOOTER_SUPPORT_LINKS.map((link) => link.to);
    expect(paths).not.toContain("/documentation");
    expect(paths).not.toContain("/api");
    expect(paths).toContain("/help");
  });

  it("detecte l'etat actif sidebar avec sous-routes", () => {
    expect(
      isDashboardNavActive("/dashboard/vehicles/abc-123", ROUTE_PATHS.dashboardVehicles),
    ).toBe(true);
    expect(isDashboardNavActive("/dashboard/vehicles", ROUTE_PATHS.dashboardVehicles)).toBe(true);
    expect(isDashboardNavActive("/dashboard/drivers", ROUTE_PATHS.dashboardVehicles)).toBe(false);
    expect(isDashboardNavActive("/dashboard/vehicles", ROUTE_PATHS.dashboard)).toBe(false);
  });

  it("n'active pas le hub administration sur les sous-pages admin dediees", () => {
    expect(isDashboardNavActive(ROUTE_PATHS.dashboardAdminUsers, ROUTE_PATHS.dashboardAdmin)).toBe(false);
    expect(isDashboardNavActive(ROUTE_PATHS.dashboardAdminDemo, ROUTE_PATHS.dashboardAdmin)).toBe(false);
    expect(isDashboardNavActive(ROUTE_PATHS.dashboardHelpAdmin, ROUTE_PATHS.dashboardAdmin)).toBe(false);
    expect(isDashboardNavActive(ROUTE_PATHS.dashboardAdmin, ROUTE_PATHS.dashboardAdmin)).toBe(true);
    expect(isDashboardNavActive(ROUTE_PATHS.dashboardAdminUsers, ROUTE_PATHS.dashboardAdminUsers)).toBe(true);
  });

  it("ne publie pas la page analytics aide dans le panel admin", () => {
    expect(DASHBOARD_NAV.admin.map((item) => item.href)).not.toContain("/dashboard/admin/help-analytics");
  });

  it("expose DASHBOARD_NAV pour tous les roles metier", () => {
    expect(DASHBOARD_NAV.organizer.length).toBeGreaterThan(10);
    expect(DASHBOARD_NAV.manager.some((item) => item.label === "Chauffeurs")).toBe(true);
    expect(DASHBOARD_NAV.driver.every((item) => item.href.startsWith("/dashboard"))).toBe(true);
    expect(DASHBOARD_NAV.mechanic.some((item) => item.label === "Historique")).toBe(true);
  });

  it("centralise les coordonnees contact publiques", () => {
    expect(CONTACT.email).toContain("@");
    expect(CONTACT.telHref).toMatch(/^tel:/);
    expect(CONTACT.phoneDisplay.length).toBeGreaterThan(8);
  });

  it("centralise l'email support produit", () => {
    expect(SUPPORT.email).toContain("@");
    expect(SUPPORT.mailtoHref).toMatch(/^mailto:/);
  });

  it("centralise l'email confidentialite", () => {
    expect(PRIVACY.email).toContain("@");
    expect(PRIVACY.mailtoHref).toMatch(/^mailto:/);
  });

  it("centralise les emails departement", () => {
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
