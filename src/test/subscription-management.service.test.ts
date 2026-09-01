import { describe, expect, it } from "vitest";

import {
  mapSubscriptionError,
  normalizeSubscriptionDetail,
  normalizeSubscriptionSummaries,
} from "@/services/subscription-management.service";

describe("normalizeSubscriptionSummaries", () => {
  it("normalizes capacity and associated vehicles from RPC rows", () => {
    const result = normalizeSubscriptionSummaries([
      {
        id: "sub-1",
        fleet_id: "fleet-1",
        fleet_name: "Yaounde",
        plan_code: "pro",
        plan_name: "Pro",
        status: "active",
        starts_at: "2026-01-01T00:00:00Z",
        ends_at: "2026-12-31T00:00:00Z",
        vehicle_capacity: "100",
        vehicle_count: "3",
        vehicles: [
          {
            id: "veh-1",
            registration: "LT-001",
            status: "ok",
            associated_at: "2026-02-01T00:00:00Z",
          },
        ],
      },
    ]);

    expect(result[0]).toMatchObject({
      id: "sub-1",
      fleetId: "fleet-1",
      fleetName: "Yaounde",
      planCode: "pro",
      planName: "Pro",
      status: "active",
      vehicleCapacity: 100,
      vehicleCount: 3,
    });
    expect(result[0].vehicles[0]).toMatchObject({
      id: "veh-1",
      registration: "LT-001",
      status: "ok",
    });
  });

  it("normalizes plan feature flags for vehicle-scoped access", () => {
    const result = normalizeSubscriptionSummaries([
      {
        id: "sub-pro",
        plan_code: "pro",
        finance_enabled: "true",
        ai_enabled: true,
        reports_enabled: true,
        driver_scoring_enabled: true,
        anomaly_insights_enabled: true,
        geofencing_enabled: true,
        scheduled_reports_enabled: true,
        offline_driver_enabled: true,
        vehicles: [],
      },
    ]);

    expect(result[0]).toMatchObject({
      financeEnabled: true,
      aiEnabled: true,
      reportsEnabled: true,
      driverScoringEnabled: true,
      anomalyInsightsEnabled: true,
      geofencingEnabled: true,
      scheduledReportsEnabled: true,
      offlineDriverEnabled: true,
    });
  });

  it("uses granted vehicle_slots instead of the Pro catalog capacity", () => {
    const result = normalizeSubscriptionSummaries([
      {
        id: "sub-pro-limited",
        plan_code: "pro",
        plan_name: "Pro",
        status: "active",
        vehicle_slots: "2",
        vehicle_capacity: "100",
        vehicle_count: "0",
        available_slots: "2",
        vehicles: [],
      },
    ]);

    expect(result[0]).toMatchObject({
      id: "sub-pro-limited",
      planCode: "pro",
      vehicleCapacity: 2,
      availableSlots: 2,
      vehicleCount: 0,
    });
  });

  it("keeps enterprise capacity unbounded when RPC returns null", () => {
    const result = normalizeSubscriptionSummaries([
      {
        id: "sub-enterprise",
        vehicle_capacity: null,
        vehicle_count: 12,
        vehicles: [],
      },
    ]);

    expect(result[0].vehicleCapacity).toBeNull();
    expect(result[0].vehicleCount).toBe(12);
  });

  it("returns an empty list for a non-array RPC response", () => {
    expect(normalizeSubscriptionSummaries(null)).toEqual([]);
    expect(normalizeSubscriptionSummaries({ subscriptions: [] })).toEqual([]);
  });

  it("normalizes missing vehicles and missing subscription id", () => {
    const result = normalizeSubscriptionSummaries([{ plan_code: "starter" }]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("");
    expect(result[0].vehicles).toEqual([]);
  });

  it("uses vehicle_id as fallback and then an empty id", () => {
    const result = normalizeSubscriptionSummaries([
      {
        id: "sub-1",
        vehicles: [{ vehicle_id: "vehicle-fallback" }, {}],
      },
    ]);

    expect(result[0].vehicles.map((vehicle) => vehicle.id)).toEqual(["vehicle-fallback", ""]);
  });
});

describe("normalizeSubscriptionDetail", () => {
  it("returns null for an empty RPC response", () => {
    expect(normalizeSubscriptionDetail(null)).toBeNull();
  });

  it("normalizes a single subscription detail", () => {
    const detail = normalizeSubscriptionDetail({
      id: "sub-1",
      plan_code: "starter",
      vehicle_capacity: 1,
      vehicle_count: 1,
      vehicles: [{ id: "veh-1", fleet_id: "fleet-1" }],
    });

    expect(detail?.planCode).toBe("starter");
    expect(detail?.vehicles[0].fleetId).toBe("fleet-1");
  });
});

describe("mapSubscriptionError", () => {
  it("transforms missing PostgREST RPC schema-cache errors into an activation message", () => {
    expect(
      mapSubscriptionError(
        "Could not find the function public.list_fleet_subscriptions(p_fleet_id) in the schema cache",
      ),
    ).toContain("module Abonnements");
  });

  it("explains incompatible plan transfers", () => {
    expect(mapSubscriptionError("abonnement_type_incompatible")).toContain("mÃªme type");
  });
});
