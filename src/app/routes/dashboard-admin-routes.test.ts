import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard admin routes", () => {
  it("protege toutes les routes /dashboard/admin avec AdminGuard", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "routes", "dashboard.routes.tsx"),
      "utf8",
    );

    for (const path of [
      "admin",
      "admin/demo",
      "admin/users",
      "admin/help-analytics",
      "admin/help",
    ]) {
      const routeIndex = source.indexOf(`path="${path}"`);
      expect(routeIndex).toBeGreaterThan(-1);

      const nextRouteIndex = source.indexOf("<Route", routeIndex + 1);
      const routeBlock =
        nextRouteIndex === -1 ? source.slice(routeIndex) : source.slice(routeIndex, nextRouteIndex);

      expect(routeBlock).toContain("<AdminGuard");
    }
  });
});
