import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bootstrapIntegrationAuth,
  canRunIntegrationAuthBootstrap,
  getMissingAuthEnv,
} from "./_auth";

const canRunIntegrationSuite = canRunIntegrationAuthBootstrap();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration("Triggers - limite véhicules plan Free", () => {
  let testOrgId: string | undefined;
  let testFleetId: string | undefined;
  const createdVehicleIds: string[] = [];
  let supabaseAdmin: Awaited<
    ReturnType<typeof bootstrapIntegrationAuth>
  >["admin"];

  const unique = Date.now();
  const testOrgName = `Test Vehicle Limit Org ${unique}`;
  const testFleetName = `Test Vehicle Limit Fleet ${unique}`;

  beforeAll(async () => {
    const context = await bootstrapIntegrationAuth();
    supabaseAdmin = context.admin;
  });

  afterAll(async () => {
    if (createdVehicleIds.length > 0) {
      await supabaseAdmin
        .from("vehicules")
        .delete()
        .in("id", createdVehicleIds);
    }

    if (testFleetId) {
      await supabaseAdmin
        .from("flotte_adhesions")
        .delete()
        .eq("fleet_id", testFleetId);
      await supabaseAdmin.from("flottes").delete().eq("id", testFleetId);
    }

    if (testOrgId) {
      await supabaseAdmin.from("organisations").delete().eq("id", testOrgId);
    }
  });

  it("bloque le 4e véhicule si la flotte est sur plan free limité à 3", async () => {
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organisations")
      .insert({
        name: testOrgName,
        country_code: "CM",
      })
      .select("id")
      .single();

    expect(orgError).toBeNull();
    expect(org?.id).toBeDefined();
    testOrgId = org!.id;

    const { data: fleetId, error: fleetCreateError } = await supabaseAdmin.rpc(
      "create_esamba_fleet",
      {
        p_org_id: testOrgId,
        p_name: testFleetName,
        p_collection_policy: "mix",
      }
    );

    expect(fleetCreateError).toBeNull();
    expect(typeof fleetId).toBe("string");
    testFleetId = fleetId as string;

    for (const index of [1, 2, 3]) {
      const { data: createdVehicle, error } = await supabaseAdmin
        .from("vehicules")
        .insert({
          fleet_id: testFleetId,
          registration: `TEST-YAO-00${index}-${unique}`,
          brand: "Renault",
          model: "Master",
          year: 2022,
          current_km: 50000 + index,
          status: "ok",
        })
        .select("id")
        .single();

      expect(error).toBeNull();
      expect(createdVehicle?.id).toBeDefined();
      createdVehicleIds.push(createdVehicle!.id);
    }

    const { error } = await supabaseAdmin.from("vehicules").insert({
      fleet_id: testFleetId,
      registration: `TEST-YAO-004-${unique}`,
      brand: "Renault",
      model: "Master",
      year: 2022,
      current_km: 50004,
      status: "ok",
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("limite");
  });
});

if (!canRunIntegrationSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingAuthEnv().join(
      ", "
    )})`
  );
}
