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

  let orgId: string;
  let fleetId: string;

  if (options?.user) {
    const { data: onboarding, error: onboardingError } = await options.user.rpc(
      "creer_onboarding_organisation_flotte_et_adhesion",
      {
        p_org_name: `IT Org ${runId}`,
        p_country_code: countryCode,
        p_fleet_name: `IT Fleet ${runId}`,
        p_collection_policy: "mix",
      }
    );

    const onboardingResult = onboarding as
      | { org_id?: string; fleet_id?: string }
      | null;

    if (
      onboardingError ||
      !onboardingResult?.org_id ||
      !onboardingResult?.fleet_id
    ) {
      throw new Error(
        `[integration setup] Onboarding flotte impossible: ${
          onboardingError?.message ?? "reponse invalide"
        }`
      );
    }

    orgId = onboardingResult.org_id;
    fleetId = onboardingResult.fleet_id;
  } else {
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

    const { data: createdFleetId, error: fleetError } = await admin.rpc(
      "creer_flotte_esamba",
      {
        p_org_id: org.id,
        p_name: `IT Fleet ${runId}`,
        p_collection_policy: "mix",
      }
    );

    if (fleetError || !createdFleetId) {
      throw new Error(
        `[integration setup] Creation flotte impossible: ${
          fleetError?.message ?? "inconnu"
        }`
      );
    }

    orgId = org.id;
    fleetId = createdFleetId;

    const { error: membershipError } = await admin
      .from("flotte_adhesions")
      .insert({
        fleet_id: fleetId,
        user_id: userId,
        role,
        is_active: true,
      });

    if (membershipError) {
      throw new Error(
        `[integration setup] Creation adhesion service impossible (${role}): ${membershipError.message}`
      );
    }
  }

  if (options?.user && role !== "organizer") {
    const { error: roleError } = await options.user.rpc(
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
    orgId,
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
