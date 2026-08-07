import { describe, expect, it } from "vitest";
import { getMobileTabsForRole, isTabActive } from "@/navigation/mobileTabs";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("mobileTabs", () => {
  it("inclut l'onglet menu pour tous les roles", () => {
    const tabs = getMobileTabsForRole("driver");
    const menuTab = tabs.find((tab) => tab.id === "menu");
    expect(menuTab?.label).toBe("Menu");
  });

  it("place le menu a la place de l'ancien onglet flotte", () => {
    const tabs = getMobileTabsForRole("organizer");
    expect(tabs.map((tab) => tab.id)).toEqual([
      "home",
      "menu",
      "alerts",
      "account",
    ]);
  });

  it("donne une entree admin dediee aux administrateurs plateforme", () => {
    const tabs = getMobileTabsForRole("organizer", true);
    const adminTab = tabs.find((tab) => tab.id === "home");

    expect(tabs.map((tab) => tab.id)).toEqual(["home", "menu", "account"]);
    expect(adminTab?.label).toBe("Admin");
    expect(adminTab?.to).toBe(ROUTE_PATHS.dashboardAdmin);
    expect(isTabActive(adminTab!, ROUTE_PATHS.dashboardAdminDemo)).toBe(true);
  });

  it("considere les routes secondaires comme actives sur l'onglet menu", () => {
    const tabs = getMobileTabsForRole("organizer");
    const menuTab = tabs.find((tab) => tab.id === "menu");
    expect(menuTab).toBeDefined();
    expect(isTabActive(menuTab!, ROUTE_PATHS.dashboardVehicles)).toBe(true);
    expect(isTabActive(menuTab!, ROUTE_PATHS.dashboardAdminDemo)).toBe(true);
    expect(isTabActive(menuTab!, "/dashboard/tutorials/tuto-01")).toBe(true);
    expect(isTabActive(menuTab!, ROUTE_PATHS.dashboardReports)).toBe(true);
  });
});
