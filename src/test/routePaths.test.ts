import { describe, expect, it } from "vitest";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("ROUTE_PATHS", () => {
  it("expose les chemins dashboard rôles et géofencing", () => {
    expect(ROUTE_PATHS.dashboardRoles).toBe("/dashboard/roles");
    expect(ROUTE_PATHS.dashboardAdminDemo).toBe("/dashboard/admin/demo");
    expect(ROUTE_PATHS.dashboardGeofencing).toBe("/dashboard/geofencing");
    expect(ROUTE_PATHS.dashboardTracking).toBe("/dashboard/tracking");
  });

  it("a des clés uniques à l'exécution", () => {
    const keys = Object.keys(ROUTE_PATHS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
