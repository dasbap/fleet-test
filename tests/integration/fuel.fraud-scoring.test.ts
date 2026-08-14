import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  canRunSupabaseIntegrationTests,
  createSupabaseIntegrationClients,
  getMissingSupabaseIntegrationEnv,
  type IntegrationClients,
} from "./helpers/supabaseTestClient";
import {
  cleanupFleetContext,
  createFleetContextForUser,
  createVehicleForFleet,
  type TestFleetContext,
} from "./helpers/testUsers";

const canRunSuite = canRunSupabaseIntegrationTests();
const describeIntegration = canRunSuite ? describe : describe.skip;

describeIntegration("Fuel fraud scoring", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;
  let vehicleId: string;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      user: clients.user,
      role: "organizer",
    });
    const { error: trialError } = await clients.admin.rpc("billing_start_trial", {
      p_fleet_id: context.fleetId,
      p_trial_days: 30,
    });
    expect(trialError).toBeNull();
    vehicleId = await createVehicleForFleet(
      clients.admin,
      context.fleetId,
      "FUEL"
    );
  });

  afterAll(async () => {
    if (clients) {
      if (context?.fleetId) {
        await clients.admin.from("billing_events").delete().eq("fleet_id", context.fleetId);
        await clients.admin.from("abonnements").delete().eq("fleet_id", context.fleetId);
      }
      await cleanupFleetContext(clients.admin, context ?? {});
    }
  });

  it("detecte une anomalie carburant et retourne un score de risque", async () => {
    const lowPriceKey = randomUUID();
    const highPriceKey = randomUUID();

    const { error: firstFuelError } = await clients.user.rpc(
      "enregistrer_carburant_offline",
      {
        p_fleet_id: context.fleetId,
        p_vehicle_id: vehicleId,
        p_driver_user_id: clients.userId,
        p_liters: 40,
        p_amount_xof: 20000,
        p_odometer_km: 1500,
        p_purchased_at: new Date().toISOString(),
        p_station_name: "Station Test A",
        p_receipt_ref: "REC-LOW",
        p_idempotency_key: lowPriceKey,
      }
    );
    expect(firstFuelError).toBeNull();

    const { error: secondFuelError } = await clients.user.rpc(
      "enregistrer_carburant_offline",
      {
        p_fleet_id: context.fleetId,
        p_vehicle_id: vehicleId,
        p_driver_user_id: clients.userId,
        p_liters: 10,
        p_amount_xof: 15000,
        p_odometer_km: 1510,
        p_purchased_at: new Date().toISOString(),
        p_station_name: "Station Test B",
        p_receipt_ref: "REC-HIGH",
        p_idempotency_key: highPriceKey,
      }
    );
    expect(secondFuelError).toBeNull();

    const { data, error } = await clients.user.rpc("predict_failure_risk", {
      p_fleet_id: context.fleetId,
      p_vehicle_id: vehicleId,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBeGreaterThan(0);

    const risk = data?.[0];
    expect(risk?.vehicle_id).toBe(vehicleId);
    expect(risk?.risk_score).toBeGreaterThanOrEqual(10);
    expect(risk?.top_signals).toBeDefined();
    expect(JSON.stringify(risk?.top_signals)).toMatch(/carburant|anomalie/i);
  });
});

if (!canRunSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(
      ", "
    )})`
  );
}
