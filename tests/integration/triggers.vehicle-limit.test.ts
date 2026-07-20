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

  it("bloque le 4e vehicule sur plan free", async () => {
    for (let index = 1; index <= 3; index += 1) {
      const { data, error } = await clients.user.rpc("creer_vehicule_esamba", {
        p_fleet_id: context.fleetId,
        p_registration: `LIM-${Date.now()}-${index}`,
        p_brand: "Toyota",
        p_model: "Corolla",
        p_year: 2022,
        p_current_km: 1200 + index,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    }

    const { error: limitError } = await clients.user.rpc(
      "creer_vehicule_esamba",
      {
        p_fleet_id: context.fleetId,
        p_registration: `LIM-${Date.now()}-4`,
        p_brand: "Honda",
        p_model: "Civic",
        p_year: 2023,
        p_current_km: 2100,
      }
    );

    expect(limitError).toBeDefined();
    expect(limitError?.message).toMatch(/limite_vehicules_plan_atteinte/i);
  });
});

if (!canRunSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(
      ", "
    )})`
  );
}
