import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadTestEnv } from "../helpers/loadTestEnv";

const env = loadTestEnv();

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

describe("DVIR RLS + RPC integration", () => {
  let testUserId = "";
  let testOrgId = "";
  let testFleetId = "";
  let testVehicleIdA = "";
  let testVehicleIdB = "";
  let guardAuthUserId = "";
  let unique = Date.now();
  const createdDvirIds: string[] = [];

  async function setMembershipRole(role: string, isActive = true) {
    const { error } = await supabaseAdmin
      .from("flotte_adhesions")
      .update({ role, is_active: isActive })
      .eq("fleet_id", testFleetId)
      .eq("user_id", testUserId);
    expect(error).toBeNull();
  }

  beforeAll(async () => {
    unique = Date.now();
    const email = `dvir-integration-${unique}@example.com`;
    const password = `DvirIntegration!${unique}`;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    expect(signUpError).toBeNull();
    expect(signUpData.user).toBeDefined();
    testUserId = signUpData.user!.id;

    const { error: profileError } = await supabase
      .from("profils")
      .insert({ user_id: testUserId, full_name: "DVIR Integration" });
    expect(profileError).toBeNull();

    const { data: orgId, error: orgError } = await supabase.rpc(
      "creer_organisation_initiale",
      { p_name: `Test DVIR Org ${unique}` }
    );
    expect(orgError).toBeNull();
    testOrgId = orgId as string;

    const { data: fleetId, error: fleetError } = await supabase.rpc(
      "creer_flotte",
      {
        p_org_id: testOrgId,
        p_name: `Test DVIR Fleet ${unique}`,
        p_collection_policy: "mix",
      }
    );

    expect(fleetError).toBeNull();
    testFleetId = fleetId as string;

    await setMembershipRole("organizer", true);

    const guardEmail = `dvir-organizer-guard-${unique}@example.com`;
    const guardPassword = `DvirGuard!${unique}`;
    const { data: guardUser, error: guardUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: guardEmail,
        password: guardPassword,
        email_confirm: true,
      });
    expect(guardUserError).toBeNull();
    expect(guardUser.user).toBeDefined();
    guardAuthUserId = guardUser.user!.id;

    const { error: guardProfileError } = await supabaseAdmin
      .from("profils")
      .insert({ user_id: guardAuthUserId, full_name: "DVIR Organizer Guard" });
    expect(guardProfileError).toBeNull();

    const { error: guardMembershipError } = await supabaseAdmin
      .from("flotte_adhesions")
      .insert({
        fleet_id: testFleetId,
        user_id: guardAuthUserId,
        role: "organizer",
        is_active: true,
      });
    expect(guardMembershipError).toBeNull();

    const { data: trialSubscriptionId, error: trialError } =
      await supabaseAdmin.rpc("billing_start_trial", {
        p_fleet_id: testFleetId,
        p_trial_days: 30,
      });
    expect(trialError).toBeNull();
    expect(trialSubscriptionId).toBeDefined();

    const { data: trialSubscription, error: trialSlotsError } =
      await supabaseAdmin
        .from("abonnements")
        .update({ vehicle_slots: 2 })
        .eq("id", trialSubscriptionId as string)
        .select("vehicle_slots")
        .single();
    expect(trialSlotsError).toBeNull();
    expect(trialSubscription?.vehicle_slots).toBe(2);

    const registrationRun = unique.toString(36).slice(-6).toUpperCase();
    const { data: vehicleIdA, error: vehicleAError } = await supabase.rpc(
      "create_esamba_vehicle",
      {
        p_fleet_id: testFleetId,
        p_registration: `DA${registrationRun}`,
        p_brand: "Toyota",
        p_model: "Corolla",
        p_year: 2021,
        p_current_km: 1000,
      }
    );

    expect(vehicleAError).toBeNull();
    testVehicleIdA = vehicleIdA as string;

    const { data: vehicleIdB, error: vehicleBError } = await supabase.rpc(
      "create_esamba_vehicle",
      {
        p_fleet_id: testFleetId,
        p_registration: `DB${registrationRun}`,
        p_brand: "Honda",
        p_model: "Civic",
        p_year: 2022,
        p_current_km: 800,
      }
    );

    expect(vehicleBError).toBeNull();
    testVehicleIdB = vehicleIdB as string;
  });

  afterAll(async () => {
    if (createdDvirIds.length > 0) {
      await supabase
        .from("controles_journaliers")
        .delete()
        .in("id", createdDvirIds);
    }

    if (testFleetId) {
      await supabaseAdmin
        .from("alertes_automatiques")
        .delete()
        .eq("fleet_id", testFleetId);
      await supabase.from("vehicules").delete().eq("fleet_id", testFleetId);
      await supabaseAdmin.from("flottes").delete().eq("id", testFleetId);
    }

    if (testOrgId) {
      await supabase.from("organisations").delete().eq("id", testOrgId);
    }

    if (guardAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(guardAuthUserId);
    }

    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    }
  });

  it("allows organizer to create and read DVIR", async () => {
    const { data, error } = await supabase.rpc("create_dvir_daily", {
      p_vehicle_id: testVehicleIdA,
      p_odometer_km: 1100,
      p_status: "ok",
      p_notes: "integration test",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    createdDvirIds.push(data as string);

    const { data: dvir, error: readError } = await supabase
      .from("controles_journaliers")
      .select("id, vehicle_id, fleet_id")
      .eq("id", data as string)
      .single();

    expect(readError).toBeNull();
    expect(dvir?.vehicle_id).toBe(testVehicleIdA);
    expect(dvir?.fleet_id).toBe(testFleetId);
  });

  it("prevents DVIR creation for a vehicle outside the fleet", async () => {
    const { data, error } = await supabase.rpc("create_dvir_daily", {
      p_vehicle_id: testVehicleIdB,
      p_odometer_km: 900,
      p_status: "ok",
      p_notes: "guard test",
      p_fleet_id: crypto.randomUUID(),
    });

    expect(data).toBeNull();
    expect(error).toBeDefined();
  });

  it("enforces organizer permissions", async () => {
    await setMembershipRole("driver", true);

    const { data, error } = await supabase.rpc("create_dvir_daily", {
      p_vehicle_id: testVehicleIdA,
      p_odometer_km: 1200,
      p_status: "ok",
      p_notes: "permission test",
    });

    expect(data).toBeNull();
    expect(error).toBeDefined();

    await setMembershipRole("organizer", true);
  });
});
