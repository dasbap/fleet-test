import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === "1";

if (runIntegration && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "Les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies",
  );
}
if (runIntegration && !supabaseServiceRoleKey) {
  throw new Error("La variable d'environnement SUPABASE_SERVICE_ROLE_KEY doit être définie");
}

const supabase = runIntegration
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as ReturnType<typeof createClient>);
const supabaseAdmin = runIntegration
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : (null as unknown as ReturnType<typeof createClient>);

describe.skipIf(!runIntegration)("DVIR SQL/RLS - matrice rôles + filtres RPC + pagination", () => {
  let testUserId = "";
  let testOrgId = "";
  let testFleetId = "";
  let testVehicleIdA = "";
  let testVehicleIdB = "";
  let testAuthUserId = "";
  const createdDvirIds: string[] = [];
  const unique = Date.now();

  async function setMembershipRole(role: "driver" | "mechanic" | "manager" | "organizer", isActive = true) {
    const { error } = await supabase.rpc("upsert_fleet_membership", {
      p_fleet_id: testFleetId,
      p_user_id: testUserId,
      p_role: role,
      p_is_active: isActive,
    });

    expect(error).toBeNull();
  }

  async function insertDvir(params?: Partial<{ vehicleId: string; status: "ok" | "unsafe" | "defects_noted" | "minor_issues"; inspectedAt: string }>) {
    const { data, error } = await supabase
      .from("controles_journaliers")
      .insert({
        fleet_id: testFleetId,
        vehicle_id: params?.vehicleId ?? testVehicleIdA,
        inspected_by: testUserId,
        inspection_type: "pre_trip",
        items: {
          freins_service: {
            status: params?.status === "unsafe" ? "defaut" : "ok",
          },
        },
        overall_status: params?.status ?? "ok",
        notes: "Test DVIR intégration",
        odometer_km: 1500,
        inspected_at: params?.inspectedAt ?? new Date().toISOString(),
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeDefined();
    createdDvirIds.push(data.id);
    return data.id as string;
  }

  beforeAll(async () => {
    const testEmail = `dvir-integration-${unique}@example.com`;
    const testPassword = `Dvir!${unique}`;

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (createUserError || !createdUser.user) {
      throw new Error(createUserError?.message ?? "Impossible de créer l'utilisateur de test");
    }
    testAuthUserId = createdUser.user.id;

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInError || !sessionData.user) {
      throw new Error(signInError?.message ?? "Impossible de se connecter avec l'utilisateur de test");
    }

    testUserId = sessionData.user.id;

    // The on_auth_user_created trigger that normally creates the profils row may be
    // absent from local migrations. Insert it explicitly so flotte_adhesions FK holds.
    const { error: profilError } = await supabaseAdmin
      .from("profils")
      .insert({ user_id: testUserId, full_name: "Test DVIR User" });
    if (profilError) throw new Error(`Impossible de créer le profil de test: ${profilError.message}`);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: `Test DVIR Org ${unique}`,
        country_code: "CM",
      })
      .select("id")
      .single();

    expect(orgError).toBeNull();
    testOrgId = org.id;

    const { data: fleetId, error: fleetError } = await supabase.rpc("create_esamba_fleet", {
      p_org_id: testOrgId,
      p_name: `Test DVIR Fleet ${unique}`,
      p_collection_policy: "mix",
    });

    expect(fleetError).toBeNull();
    testFleetId = fleetId as string;

    await setMembershipRole("organizer", true);

    const { data: vehicleIdA, error: vehicleAError } = await supabase.rpc("create_esamba_vehicle", {
      p_fleet_id: testFleetId,
      p_registration: `DVIR-A-${unique}`,
      p_brand: "Toyota",
      p_model: "Corolla",
      p_year: 2021,
      p_current_km: 1000,
    });

    expect(vehicleAError).toBeNull();
    testVehicleIdA = vehicleIdA as string;

    const { data: vehicleIdB, error: vehicleBError } = await supabase.rpc("create_esamba_vehicle", {
      p_fleet_id: testFleetId,
      p_registration: `DVIR-B-${unique}`,
      p_brand: "Honda",
      p_model: "Civic",
      p_year: 2022,
      p_current_km: 800,
    });

    expect(vehicleBError).toBeNull();
    testVehicleIdB = vehicleIdB as string;
  });

  afterAll(async () => {
    if (createdDvirIds.length > 0) {
      await supabase.from("controles_journaliers").delete().in("id", createdDvirIds);
    }

    if (testFleetId) {
      await supabase.from("vehicules").delete().eq("fleet_id", testFleetId);
      await supabase.from("flotte_adhesions").delete().eq("fleet_id", testFleetId);
      await supabase.from("flottes").delete().eq("id", testFleetId);
    }

    if (testOrgId) {
      await supabase.from("organisations").delete().eq("id", testOrgId);
    }

    if (testAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testAuthUserId);
    }
  });

  it("autorise l'insertion DVIR pour chaque rôle actif autorisé", async () => {
    const roles: Array<"driver" | "mechanic" | "manager" | "organizer"> = [
      "driver",
      "mechanic",
      "manager",
      "organizer",
    ];

    for (const role of roles) {
      await setMembershipRole(role, true);
      await insertDvir({ status: "ok" });
    }
  });

  it("refuse l'insertion DVIR si l'adhésion est inactive", async () => {
    await setMembershipRole("driver", false);

    const { error } = await supabase.from("controles_journaliers").insert({
      fleet_id: testFleetId,
      vehicle_id: testVehicleIdA,
      inspected_by: testUserId,
      inspection_type: "pre_trip",
      items: { freins_service: { status: "ok" } },
      overall_status: "ok",
      notes: "Doit être refusé",
      odometer_km: 900,
    });

    expect(error).toBeDefined();

    await setMembershipRole("organizer", true);
  });

  it("applique les filtres de get_dvir_list (status, vehicle, date)", async () => {
    const now = new Date();
    const d1 = new Date(now.getTime() - 3 * 60_000).toISOString();
    const d2 = new Date(now.getTime() - 2 * 60_000).toISOString();
    const d3 = new Date(now.getTime() - 1 * 60_000).toISOString();

    await insertDvir({ vehicleId: testVehicleIdA, status: "ok", inspectedAt: d1 });
    await insertDvir({ vehicleId: testVehicleIdB, status: "unsafe", inspectedAt: d2 });
    await insertDvir({ vehicleId: testVehicleIdB, status: "unsafe", inspectedAt: d3 });

    const { data: unsafeRows, error: unsafeError } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: testFleetId,
      p_status: "unsafe",
      p_limit: 50,
      p_offset: 0,
    });

    expect(unsafeError).toBeNull();
    expect(Array.isArray(unsafeRows)).toBe(true);
    expect((unsafeRows ?? []).length).toBeGreaterThanOrEqual(2);
    for (const row of unsafeRows ?? []) {
      expect(row.status).toBe("unsafe");
    }

    const { data: vehicleRows, error: vehicleError } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: testFleetId,
      p_vehicle_id: testVehicleIdB,
      p_limit: 50,
      p_offset: 0,
    });

    expect(vehicleError).toBeNull();
    expect((vehicleRows ?? []).length).toBeGreaterThanOrEqual(2);
    for (const row of vehicleRows ?? []) {
      expect(row.vehicle_id).toBe(testVehicleIdB);
    }

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const { data: dateRows, error: dateError } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: testFleetId,
      p_date_from: dayStart.toISOString().slice(0, 10),
      p_date_to: now.toISOString().slice(0, 10),
      p_limit: 50,
      p_offset: 0,
    });

    expect(dateError).toBeNull();
    expect((dateRows ?? []).length).toBeGreaterThan(0);
  });

  it("applique correctement la pagination get_dvir_list", async () => {
    const { data: page1, error: page1Error } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: testFleetId,
      p_limit: 1,
      p_offset: 0,
    });
    expect(page1Error).toBeNull();
    expect(page1?.length).toBe(1);

    const { data: page2, error: page2Error } = await supabase.rpc("get_dvir_list", {
      p_fleet_id: testFleetId,
      p_limit: 1,
      p_offset: 1,
    });
    expect(page2Error).toBeNull();
    expect(page2?.length).toBe(1);

    expect(page1?.[0]?.id).not.toBe(page2?.[0]?.id);
  });
});
