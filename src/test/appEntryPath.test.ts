import { describe, it, expect } from "vitest";
import { getAppEntryPath } from "@/navigation/appEntryPath";
import { ROUTE_PATHS } from "@/navigation/routePaths";

describe("getAppEntryPath", () => {
  it("redirige le conducteur vers /terrain", () => {
    expect(getAppEntryPath("driver")).toBe(ROUTE_PATHS.terrain);
  });

  it("redirige le mécanicien vers la maintenance dashboard", () => {
    expect(getAppEntryPath("mechanic")).toBe(ROUTE_PATHS.dashboardMaintenance);
  });

  it("redirige organizer et manager vers le dashboard", () => {
    expect(getAppEntryPath("organizer")).toBe(ROUTE_PATHS.dashboard);
    expect(getAppEntryPath("manager")).toBe(ROUTE_PATHS.dashboard);
  });

  it("utilise le dashboard par défaut sans rôle", () => {
    expect(getAppEntryPath(null)).toBe(ROUTE_PATHS.dashboard);
    expect(getAppEntryPath(undefined)).toBe(ROUTE_PATHS.dashboard);
  });
});
