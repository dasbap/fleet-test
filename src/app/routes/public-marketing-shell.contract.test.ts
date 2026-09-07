import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routesSource = readFileSync(
  fileURLToPath(new URL("./app.routes.tsx", import.meta.url)),
  "utf8"
);

const dashboardShellMatch = routesSource.match(
  /<Route element={<AuthenticatedDashboardLayout \/>}>([\s\S]*?)<\/Route>/
);

const dashboardShellSource = dashboardShellMatch?.[1] ?? "";

const publicMarketingPaths = [
  "/contact",
  "/modules",
  "/fonctionnalites",
  "/fonctionnalites/piloter-flotte",
] as const;

describe("public marketing route shell contract", () => {
  it("keeps the authenticated dashboard shell in the route tree", () => {
    expect(dashboardShellMatch).not.toBeNull();
  });

  it.each(publicMarketingPaths)(
    "keeps %s outside the authenticated dashboard shell",
    (path) => {
      expect(routesSource).toContain(`path=\"${path}\"`);
      expect(dashboardShellSource).not.toContain(`path=\"${path}\"`);
    }
  );

  it("keeps authenticated feature routes inside the dashboard shell", () => {
    expect(dashboardShellSource).toContain('path="/fuel"');
    expect(dashboardShellSource).toContain('path="/inspections"');
    expect(dashboardShellSource).toContain('path="/transit"');
  });
});
