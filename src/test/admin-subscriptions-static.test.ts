import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("admin subscription grant module", () => {
  it("exposes a super-admin page with plan, expiration and permanence controls", () => {
    const routes = readFileSync("src/app/routes/dashboard.routes.tsx", "utf8");
    const routePaths = readFileSync("src/navigation/routePaths.ts", "utf8");
    const adminDashboard = readFileSync("src/pages/admin/AdminDashboardPage.tsx", "utf8");
    const page = readFileSync("src/pages/admin/AdminSubscriptionsPage.tsx", "utf8");

    expect(routePaths).toContain('dashboardAdminSubscriptions: "/dashboard/admin/subscriptions"');
    expect(routes).toContain('path="admin/subscriptions"');
    expect(routes).toContain("AdminSubscriptionsPage");
    expect(adminDashboard).toContain("Abonnements");
    expect(adminDashboard).toContain("isSuperAdmin");
    expect(page).toContain("isSuperAdmin");
    expect(page).toContain("Plan");
    expect(page).toContain("Nombre de vehicules");
    expect(page).toContain("selectedPlan?.maxVehicles");
    expect(page).toContain("max={selectedPlan?.maxVehicles ?? undefined}");
    expect(page).toContain("Date d'expiration");
    expect(page).toContain("Permanent");
  });
});
