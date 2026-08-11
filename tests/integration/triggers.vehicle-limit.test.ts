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

const canRunSuite = canRunSupabaseIntegrationTests();
const describeIntegration = canRunSuite ? describe : describe.skip;

describeIntegration("Trigger limite vehicules", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      user: clients.user,
      role: "organizer",
    });
  });

  afterAll(async () => {
    if (clients) {
      await cleanupFleetContext(clients.admin, context ?? {});
    }
  });

  it("bloque le 2e vehicule sur le seul slot free", async () => {
    const { data, error } = await clients.user.rpc("creer_vehicule_esamba", {
      p_fleet_id: context.fleetId,
      p_registration: `LIM-${Date.now()}-1`,
      p_brand: "Toyota",
      p_model: "Corolla",
      p_year: 2022,
      p_current_km: 1201,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const { error: limitError } = await clients.user.rpc(
      "creer_vehicule_esamba",
      {
        p_fleet_id: context.fleetId,
        p_registration: `LIM-${Date.now()}-2`,
        p_brand: "Honda",
        p_model: "Civic",
        p_year: 2023,
        p_current_km: 2100,
      }
    );

    expect(limitError).toBeDefined();
    expect(limitError?.message).toMatch(/limite_vehicules_(plan|abonnements)_atteinte/i);
  });
});

if (!canRunSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(
      ", "
    )})`
  );
}
