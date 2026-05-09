import { describe, expect, it } from "vitest";
import { getMobileOutletShellClass } from "./mobileOutletShellClass";

describe("getMobileOutletShellClass", () => {
  it("applique la teinte Accueil sur /dashboard", () => {
    expect(getMobileOutletShellClass("/dashboard")).toContain("primary");
  });

  it("applique la teinte Flotte pour véhicules, my-vehicle, maintenance et history", () => {
    const fleetShell = getMobileOutletShellClass("/dashboard/vehicles");
    expect(fleetShell).toContain("muted");
    expect(getMobileOutletShellClass("/dashboard/vehicles/x")).toBe(fleetShell);
    expect(getMobileOutletShellClass("/dashboard/my-vehicle")).toBe(fleetShell);
    expect(getMobileOutletShellClass("/dashboard/maintenance")).toBe(fleetShell);
    expect(getMobileOutletShellClass("/dashboard/history")).toBe(fleetShell);
  });

  it("applique la teinte Alertes", () => {
    expect(getMobileOutletShellClass("/dashboard/alerts")).toContain("warning");
  });

  it("applique la teinte Opérations", () => {
    expect(getMobileOutletShellClass("/dashboard/operations")).toContain("primary");
  });

  it("applique la teinte Compte pour profil et paramètres", () => {
    expect(getMobileOutletShellClass("/dashboard/profile")).toContain("muted");
    expect(getMobileOutletShellClass("/dashboard/settings")).toContain("muted");
  });

  it("normalise le slash final", () => {
    expect(getMobileOutletShellClass("/dashboard/")).toBe(
      getMobileOutletShellClass("/dashboard")
    );
  });
});
