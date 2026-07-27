import type { SupabaseClient } from "@supabase/supabase-js";
import { createTestRunId } from "./supabaseTestClient";

export type TestFleetContext = {
  orgId: string;
  fleetId: string;
  userId: string;
  runId: string;
};

export async function createFleetContextForUser(
  admin: SupabaseClient,
  userId: string,
  options?: {
    user?: SupabaseClient;
    countryCode?: string;
    role?: "organizer" | "manager" | "mechanic" | "driver";
    runId?: string;
  }
): Promise<TestFleetContext> {
  const runId = options?.runId ?? createTestRunId("fleet");
  const role = options?.role ?? "organizer";
  const countryCode = options?.countryCode ?? "CM";

  const { data: org, error: orgError } = await admin
    .from("organisations")
    .insert({
      name: `IT Org ${runId}`,
      country_code: countryCode,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    throw new Error(
      `[integration setup] Creation organisation impossible: ${
        orgError?.message ?? "inconnu"
      }`
    );
  }

  const { data: fleetId, error: fleetError } = await admin.rpc(
    "creer_flotte_esamba",
    {
      p_org_id: org.id,
      p_name: `IT Fleet ${runId}`,
      p_collection_policy: "mix",
    }
  );

  if (fleetError || !fleetId) {
    throw new Error(
      `[integration setup] Creation flotte impossible: ${
        fleetError?.message ?? "inconnu"
      }`
    );
  }

  const membershipClient = options?.user ?? admin;
  const bootstrapRole = role === "organizer" ? role : "organizer";

  const { error: bootstrapError } = await membershipClient.rpc(
    "creer_ou_mettre_a_jour_adhesion_flotte",
    {
      p_fleet_id: fleetId,
      p_user_id: userId,
      p_role: bootstrapRole,
      p_is_active: true,
    }
  );

  if (bootstrapError) {
    throw new Error(
      `[integration setup] Creation adhesion impossible (${bootstrapRole}): ${bootstrapError.message}`
    );
  }

  if (role !== bootstrapRole) {
    const { error: roleError } = await membershipClient.rpc(
      "creer_ou_mettre_a_jour_adhesion_flotte",
      {
        p_fleet_id: fleetId,
        p_user_id: userId,
        p_role: role,
        p_is_active: true,
      }
    );

    if (roleError) {
      throw new Error(
        `[integration setup] Mise a jour adhesion impossible (${role}): ${roleError.message}`
      );
    }
  }

  return {
    orgId: org.id,
    fleetId,
    userId,
    runId,
  };
}

export async function createVehicleForFleet(
  admin: SupabaseClient,
  fleetId: string,
  registrationPrefix = "IT"
): Promise<string> {
  const runId = createTestRunId("vh");
  const registration = `${registrationPrefix}-${runId}`
    .slice(0, 30)
    .toUpperCase();
  const { data, error } = await admin.rpc("creer_vehicule_esamba", {
    p_fleet_id: fleetId,
    p_registration: registration,
    p_brand: "Toyota",
    p_model: "Corolla",
    p_year: 2021,
    p_current_km: 1000,
  });

  if (error || !data) {
    throw new Error(
      `[integration setup] Creation vehicule impossible: ${
        error?.message ?? "inconnu"
      }`
    );
  }

  return data;
}

export async function cleanupFleetContext(
  admin: SupabaseClient,
  context: Partial<TestFleetContext>
): Promise<void> {
  const fleetId = context.fleetId;
  const orgId = context.orgId;

  if (fleetId) {
    await admin.from("journal_carburant").delete().eq("fleet_id", fleetId);
    await admin.from("payment_transactions").delete().eq("fleet_id", fleetId);
    await admin.from("alertes_automatiques").delete().eq("fleet_id", fleetId);
    await admin.from("failure_predictions").delete().eq("fleet_id", fleetId);
    await admin.from("scores_conducteurs").delete().eq("fleet_id", fleetId);
    await admin.from("vehicules").delete().eq("fleet_id", fleetId);
    await admin.from("flotte_adhesions").delete().eq("fleet_id", fleetId);
    await admin.from("flotte_invitations").delete().eq("fleet_id", fleetId);
    await admin.from("flottes").delete().eq("id", fleetId);
  }

  if (orgId) {
    await admin.from("organisations").delete().eq("id", orgId);
  }

  if (context.userId) {
    await admin.from("profils").delete().eq("user_id", context.userId);
    await admin.auth.admin.deleteUser(context.userId);
  }
}
