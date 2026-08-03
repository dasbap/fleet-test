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

describeIntegration("RLS - acces flotte", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      user: clients.user,
      role: "organizer",
    });

    const runToken = context.runId.slice(-8).toUpperCase();
    for (const index of [1, 2, 3]) {
      const { error } = await clients.user.rpc("creer_vehicule_esamba", {
        p_fleet_id: context.fleetId,
        p_registration: `IT-RLS-${runToken}-${index}`,
        p_brand: "Toyota",
        p_model: "Hiace",
        p_year: 2020 + index,
        p_current_km: 10000 + index,
      });

      expect(error).toBeNull();
    }
  });

  afterAll(async () => {
    if (clients) {
      await cleanupFleetContext(clients.admin, context ?? { userId: clients.userId });
    }
  });

  it("verifie que la flotte test existe", async () => {
    const { data, error } = await clients.admin
      .from("flottes")
      .select("id,name")
      .eq("id", context.fleetId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(context.fleetId);
  });

  it("verifie que les vehicules test sont visibles cote service role", async () => {
    const { data, error } = await clients.admin
      .from("vehicules")
      .select("registration")
      .eq("fleet_id", context.fleetId)
      .like("registration", "IT-RLS-%");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(3);
  });
});

if (!canRunIntegrationSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(", ")})`,
  );
}
