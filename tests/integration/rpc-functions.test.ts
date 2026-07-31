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

describeIntegration("Fonctions RPC - verification des noms de tables", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;
  let vehicleId: string;
  let invitationCode: string;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      user: clients.user,
      role: "organizer",
    });
    invitationCode = `RPC-${context.runId}`.slice(0, 32).toUpperCase();
  });

  afterAll(async () => {
    if (clients) {
      await cleanupFleetContext(clients.admin, context ?? { userId: clients.userId });
    }
  });

  it("creer_flotte_esamba utilise les tables organisations et flottes", async () => {
    const { data, error } = await clients.admin
      .from("flottes")
      .select("id,name,org_id")
      .eq("id", context.fleetId)
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBe(context.fleetId);
    expect(data?.org_id).toBe(context.orgId);
  });

  it("creer_ou_mettre_a_jour_adhesion_flotte utilise la table flotte_adhesions", async () => {
    const { error: deniedError } = await clients.user.rpc(
      "creer_ou_mettre_a_jour_adhesion_flotte",
      {
        p_fleet_id: context.fleetId,
        p_user_id: "00000000-0000-0000-0000-000000000001",
        p_role: "driver",
        p_is_active: true,
      },
    );

    expect(deniedError).toBeDefined();
    expect(deniedError?.message).not.toMatch(/relation.*does not exist|table.*does not exist/i);

    const { data, error } = await clients.user.rpc(
      "creer_ou_mettre_a_jour_adhesion_flotte",
      {
        p_fleet_id: context.fleetId,
        p_user_id: clients.userId,
        p_role: "organizer",
        p_is_active: true,
      },
    );

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const { data: membership, error: membershipError } = await clients.admin
      .from("flotte_adhesions")
      .select("*")
      .eq("fleet_id", context.fleetId)
      .eq("user_id", clients.userId)
      .single();

    expect(membershipError).toBeNull();
    expect(membership?.role).toBe("organizer");
  });

  it("creer_vehicule_esamba utilise les tables flottes et vehicules", async () => {
    const registration = `RPC-VH-${context.runId}`.slice(0, 30).toUpperCase();
    const { data, error } = await clients.user.rpc("creer_vehicule_esamba", {
      p_fleet_id: context.fleetId,
      p_registration: registration,
      p_brand: "Honda",
      p_model: "Civic",
      p_year: 2021,
      p_current_km: 1000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    vehicleId = data as string;

    const { data: vehicle, error: vehicleError } = await clients.admin
      .from("vehicules")
      .select("*")
      .eq("id", vehicleId)
      .single();

    expect(vehicleError).toBeNull();
    expect(vehicle?.registration).toBe(registration);
  });

  it("creer_invitation_esamba utilise les tables flottes et flotte_invitations", async () => {
    const { data, error } = await clients.user.rpc("creer_invitation_esamba", {
      p_fleet_id: context.fleetId,
      p_code: invitationCode,
    });

    expect(error).toBeNull();
    expect(data).toBe(invitationCode);

    const { data: invitation, error: invitationError } = await clients.admin
      .from("flotte_invitations")
      .select("*")
      .eq("code", invitationCode)
      .single();

    expect(invitationError).toBeNull();
    expect(invitation?.fleet_id).toBe(context.fleetId);
  });

  it("verifier_esamba_2024 retourne les criteres de verification", async () => {
    const { data, error } = await clients.admin.rpc("verifier_esamba_2024");

    expect(error).toBeNull();
    expect(Array.isArray(data) && data.length > 0).toBe(true);

    const result = data[0];
    expect(result).toHaveProperty("organisation");
    expect(result).toHaveProperty("flotte");
    expect(result).toHaveProperty("membership_organizer");
    expect(result).toHaveProperty("vehicule_esamba_001");
    expect(result).toHaveProperty("invitation_esamba_2024");
  });

  it("ajouter_membre_par_email utilise les tables flottes et flotte_adhesions", async () => {
    const { error } = await clients.user.rpc("ajouter_membre_par_email", {
      p_fleet_id: context.fleetId,
      p_email: `missing-${context.runId}@example.com`,
      p_role: "driver",
    });

    expect(error).toBeDefined();
    expect(error?.message).toMatch(/introuvable|not found|permission|denied/i);
    expect(error?.message).not.toMatch(/relation.*does not exist|table.*does not exist/i);
  });
});

if (!canRunIntegrationSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(", ")})`,
  );
}
