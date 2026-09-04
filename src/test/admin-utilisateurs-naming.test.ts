import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("admin utilisateurs naming", () => {
  it("utilise /dashboard/admin/utilisateurs comme route canonique", () => {
    expect(ROUTE_PATHS.dashboardAdminDemo).toBe("/dashboard/admin/utilisateurs");
  });

  it("n'affiche plus le vocabulaire demo dans la navigation admin", () => {
    const navigation = readFileSync("src/config/navigation.ts", "utf8");
    const dashboard = readFileSync("src/pages/admin/AdminDashboardPage.tsx", "utf8");
    const usersPage = readFileSync("src/pages/admin/DemoAdminPage.tsx", "utf8");

    expect(navigation).toContain('{ label: "Utilisateurs", href: ROUTE_PATHS.dashboardAdminDemo }');
    expect(navigation).not.toContain('label: "Comptes demo"');
    expect(dashboard).not.toContain('title: "Accès démo"');
    expect(usersPage).not.toContain("comptes démo");
    expect(usersPage).not.toContain("Nouvel accès démo");
  });

  it("conserve uniquement une redirection legacy depuis /admin/demo", () => {
    const routes = readFileSync("src/app/routes/dashboard.routes.tsx", "utf8");
    expect(routes).toContain('path="admin/utilisateurs"');
    expect(routes).toContain('path="admin/demo"');
    expect(routes).toContain("<Navigate to={ROUTE_PATHS.dashboardAdminDemo} replace />");
  });
});
