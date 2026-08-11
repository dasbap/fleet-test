import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canRunSupabaseIntegrationTests,
  createSupabaseIntegrationClients,
  getMissingSupabaseIntegrationEnv,
  type IntegrationClients,
} from "./helpers/supabaseTestClient";
import {
  cleanupFleetContext,
  createFleetContextForUser,
  type TestFleetContext,
} from "./helpers/testUsers";

const canRunIntegrationSuite = canRunSupabaseIntegrationTests();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration("Triggers - limite vehicules plan Free", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;

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
  });

  afterAll(async () => {
    if (clients) {
      if (context?.fleetId) {
        await clients.admin.from("billing_events").delete().eq("fleet_id", context.fleetId);
        await clients.admin.from("abonnements").delete().eq("fleet_id", context.fleetId);
      }
      await cleanupFleetContext(clients.admin, context ?? { userId: clients.userId });
    }
  });

  it("bloque le 2e vehicule si la flotte est sur plan free limite a 1", async () => {
    const runToken = context.runId.slice(-8).toUpperCase();
    const { data, error: createError } = await clients.user.rpc("creer_vehicule_esamba", {
      p_fleet_id: context.fleetId,
      p_registration: `IT-LIM-${runToken}-1`,
      p_brand: "Renault",
      p_model: "Master",
      p_year: 2022,
      p_current_km: 50001,
    });

    expect(createError).toBeNull();
    expect(data).toBeDefined();

    const { error } = await clients.user.rpc("creer_vehicule_esamba", {
      p_fleet_id: context.fleetId,
      p_registration: `IT-LIM-${runToken}-2`,
      p_brand: "Renault",
      p_model: "Master",
      p_year: 2022,
      p_current_km: 50002,
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("limite");
  });
});

if (!canRunIntegrationSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(", ")})`,
  );
}
