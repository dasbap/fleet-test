import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("demo sessions subscription management", () => {
  it("does not expose the legacy direct fleet plan mutation in demo sessions", () => {
    const panel = readFileSync("src/components/admin/DemoSessionsPanel.tsx", "utf8");
    const page = readFileSync("src/pages/admin/DemoAdminPage.tsx", "utf8");
    const hook = readFileSync("src/hooks/useAdminDemoAccounts.ts", "utf8");

    expect(panel).not.toContain("onSetFleetPlan");
    expect(panel).not.toContain("handleSetPlan");
    expect(panel).not.toContain("Plan de ${session.email}");
    expect(panel).not.toContain("Appliquer");
    expect(panel).toContain("ROUTE_PATHS.dashboardAdminSubscriptions");
    expect(page).not.toContain("setFleetPlan");
    expect(hook).not.toContain("setFleetPlan:");
  });
});
