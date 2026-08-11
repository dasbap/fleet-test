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
});
