import { describe, expect, it } from "vitest";
import { getMobileTabsForRole, isTabActive } from "@/navigation/mobileTabs";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("mobileTabs", () => {
  it("inclut l’onglet tutoriels pour tous les rôles", () => {
    const tabs = getMobileTabsForRole("driver");
    const tutorialsTab = tabs.find((tab) => tab.id === "tutorials");
    expect(tutorialsTab?.to).toBe(ROUTE_PATHS.dashboardTutorials);
  });

  it("considère les routes tutoriels comme actives", () => {
    const tabs = getMobileTabsForRole("organizer");
    const tutorialsTab = tabs.find((tab) => tab.id === "tutorials");
    expect(tutorialsTab).toBeDefined();
    expect(isTabActive(tutorialsTab!, "/dashboard/tutorials/tuto-01")).toBe(true);
  });
});
