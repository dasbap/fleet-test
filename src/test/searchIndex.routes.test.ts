import { describe, expect, it } from "vitest";
import { SEARCH_ACTIONS, SEARCH_PAGES } from "@/data/search/searchIndex";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("searchIndex — routes dashboard", () => {
  it("pointe les pages métier vers /dashboard/*", () => {
    const vehicles = SEARCH_PAGES.find((item) => item.id === "p-vehicles");
    expect(vehicles?.route).toBe(ROUTE_PATHS.dashboardVehicles);
    expect(vehicles?.route?.startsWith("/dashboard/")).toBe(true);
  });

  it("pointe l'action ajouter véhicule vers /dashboard/vehicles/new", () => {
    const action = SEARCH_ACTIONS.find((item) => item.id === "a-new-vehicle");
    expect(action?.route).toBe(ROUTE_PATHS.dashboardVehiclesNew);
  });

  it("n'utilise plus de routes racine obsolètes /vehicles ou /billing", () => {
    const routes = [...SEARCH_PAGES, ...SEARCH_ACTIONS]
      .map((item) => item.route)
      .filter(Boolean);
    expect(routes).not.toContain("/vehicles");
    expect(routes).not.toContain("/vehicles/new");
    expect(routes).not.toContain("/billing");
  });
});
