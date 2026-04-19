import { describe, expect, it } from "vitest";
import { computeAuthFlowPermissions } from "@/lib/auth-flow-permissions";
import type { PlanEnables } from "@/types/auth";

const allOn: PlanEnables = {
  finance: true,
  ai: true,
  reports: true,
  driver_scoring: true,
  anomaly_insights: true,
};

const allOff: PlanEnables = {
  finance: false,
  ai: false,
  reports: false,
  driver_scoring: false,
  anomaly_insights: false,
};

describe("computeAuthFlowPermissions", () => {
  it("sans rôle : tout à false sauf viewDashboard", () => {
    const can = computeAuthFlowPermissions(null, allOn);
    expect(can.viewDashboard).toBe(false);
    expect(can.manageOrg).toBe(false);
  });

  it("organisateur + plan complet : accès étendu", () => {
    const can = computeAuthFlowPermissions("organizer", allOn);
    expect(can.viewDashboard).toBe(true);
    expect(can.manageOrg).toBe(true);
    expect(can.manageVehicles).toBe(true);
    expect(can.viewFinance).toBe(true);
    expect(can.viewReports).toBe(true);
    expect(can.useAI).toBe(true);
  });

  it("conducteur : pas finance ni rapports même si plan", () => {
    const can = computeAuthFlowPermissions("driver", allOn);
    expect(can.openCreneaux).toBe(true);
    expect(can.viewFinance).toBe(false);
    expect(can.viewReports).toBe(false);
    expect(can.manageVehicles).toBe(false);
  });

  it("finance désactivée au plan : pas viewFinance pour organizer", () => {
    const can = computeAuthFlowPermissions("organizer", { ...allOn, finance: false });
    expect(can.viewFinance).toBe(false);
  });

  it("visitor : lecture seule métier (pas de gestion)", () => {
    const can = computeAuthFlowPermissions("visitor", allOn);
    expect(can.viewDashboard).toBe(true);
    expect(can.manageVehicles).toBe(false);
    expect(can.viewFinance).toBe(false);
  });
});
