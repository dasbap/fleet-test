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
const describeIfReady = canRunSuite ? describe : describe.skip;

describeIfReady("RLS flotte - controle des acces", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      role: "manager",
    });
  });

  afterAll(async () => {
    if (clients) {
      await cleanupFleetContext(clients.admin, context ?? {});
    }
  });

  it("autorise un membre actif a lire sa flotte", async () => {
    const { data, error } = await clients.user
      .from("flottes")
      .select("id,name")
      .eq("id", context.fleetId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(context.fleetId);
  });

  it("refuse la lecture quand l'adhesion est desactivee", async () => {
    const { error: deactivationError } = await clients.admin.rpc("creer_ou_mettre_a_jour_adhesion_flotte", {
      p_fleet_id: context.fleetId,
      p_user_id: clients.userId,
      p_role: "manager",
      p_is_active: false,
    });
    expect(deactivationError).toBeNull();

    const { data, error } = await clients.user
      .from("flottes")
      .select("id")
      .eq("id", context.fleetId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("refuse la mutation de role pour un utilisateur non cible", async () => {
    const { error } = await clients.user.rpc("creer_ou_mettre_a_jour_adhesion_flotte", {
      p_fleet_id: context.fleetId,
      p_user_id: "00000000-0000-0000-0000-000000000001",
      p_role: "organizer",
      p_is_active: true,
    });

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/permission|refus|denied/i);
  });
});

if (!canRunSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(", ")})`,
  );
}
