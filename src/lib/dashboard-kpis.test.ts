import { describe, expect, it } from "vitest";
import {
  buildDashboardKpisFallback,
  canFetchDashboardKpis,
  DASHBOARD_EMPTY_KPIS,
  mapRpcKpiSummary,
  resolveActionableDashboardKpis,
} from "@/lib/dashboard-kpis";

const SAMPLE_KPIS = {
  ...DASHBOARD_EMPTY_KPIS,
  activeVehicles: 4,
  criticalAlerts: 1,
};

const VALID_ORG = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("resolveActionableDashboardKpis", () => {
  it("retourne les données distantes quand présentes", () => {
    const result = resolveActionableDashboardKpis({
      orgId: VALID_ORG,
      kpisData: SAMPLE_KPIS,
      isKpisError: false,
      skipRemoteKpis: false,
    });
    expect(result.kpis).toEqual(SAMPLE_KPIS);
    expect(result.kpisDegraded).toBe(false);
  });

  it("retourne des zéros pour orgId invalide (ex. mock-org)", () => {
    const result = resolveActionableDashboardKpis({
      orgId: "mock-org",
      kpisData: undefined,
      isKpisError: false,
      skipRemoteKpis: false,
    });
    expect(result.kpis).toEqual(DASHBOARD_EMPTY_KPIS);
    expect(result.kpisDegraded).toBe(false);
  });

  it("marque dégradé en cas d'erreur RPC sans repli", () => {
    const result = resolveActionableDashboardKpis({
      orgId: VALID_ORG,
      kpisData: undefined,
      isKpisError: true,
      skipRemoteKpis: false,
    });
    expect(result.kpis).toEqual(DASHBOARD_EMPTY_KPIS);
    expect(result.kpisDegraded).toBe(true);
  });

  it("utilise le repli stats+alertes si la RPC échoue", () => {
    const fallback = buildDashboardKpisFallback(
      { activeVehicles: 3, maintenanceInProgress: 1 },
      [{ severity: "critical", type: "oil" }],
    );
    const result = resolveActionableDashboardKpis({
      orgId: VALID_ORG,
      kpisData: undefined,
      isKpisError: true,
      skipRemoteKpis: false,
      fallbackKpis: fallback,
    });
    expect(result.kpis).toEqual(fallback);
    expect(result.kpisDegraded).toBe(false);
  });

  it("court-circuite en auth mock sans bandeau dégradé", () => {
    const result = resolveActionableDashboardKpis({
      orgId: VALID_ORG,
      kpisData: undefined,
      isKpisError: false,
      skipRemoteKpis: true,
    });
    expect(result.kpis).toEqual(DASHBOARD_EMPTY_KPIS);
    expect(result.kpisDegraded).toBe(false);
  });
});

describe("mapRpcKpiSummary", () => {
  it("mappe la réponse JSONB camelCase", () => {
    expect(
      mapRpcKpiSummary({
        activeVehicles: 2,
        inMaintenance: 1,
        criticalAlerts: 3,
        overdueServices: 0,
        deltaCritical: 1,
        deltaActive: 2,
      }),
    ).toMatchObject({ activeVehicles: 2, criticalAlerts: 3 });
  });
});

describe("buildDashboardKpisFallback", () => {
  it("agrège stats flotte et alertes actives", () => {
    expect(
      buildDashboardKpisFallback(
        { activeVehicles: 5, maintenanceInProgress: 2 },
        [
          { severity: "critical", type: "oil" },
          { severity: "critical", type: "ct" },
          { severity: "warning", type: "ct" },
        ],
      ),
    ).toEqual({
      activeVehicles: 5,
      inMaintenance: 2,
      criticalAlerts: 2,
      overdueServices: 2,
      deltaCritical: 0,
      deltaActive: 0,
    });
  });
});

describe("canFetchDashboardKpis", () => {
  it("refuse mock-org et auth mock", () => {
    expect(canFetchDashboardKpis("mock-org", false)).toBe(false);
    expect(canFetchDashboardKpis(VALID_ORG, true)).toBe(false);
    expect(canFetchDashboardKpis(VALID_ORG, false)).toBe(true);
  });
});
