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

function computeFuelConsumptionLitersPer100km(
  liters: number,
  kmDelta: number,
): number | null {
  if (kmDelta <= 0) return null;
  return (liters / kmDelta) * 100;
}

function detectFuelAnomaly(
  consumption: number | null,
): "invalid_km" | "high_consumption" | "suspicious_low_consumption" | "normal" {
  if (consumption === null) return "invalid_km";
  if (consumption > 18) return "high_consumption";
  if (consumption < 3) return "suspicious_low_consumption";
  return "normal";
}

const canRunIntegrationSuite = canRunSupabaseIntegrationTests();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration("Fraude carburant - scoring simple", () => {
  let clients: IntegrationClients;
  let context: TestFleetContext;
  let vehicleId: string;
  let registration: string;

  beforeAll(async () => {
    clients = await createSupabaseIntegrationClients();
    context = await createFleetContextForUser(clients.admin, clients.userId, {
      user: clients.user,
      role: "organizer",
    });
    registration = `IT-FUEL-${context.runId}`.slice(0, 30).toUpperCase();

    const { data, error } = await clients.user.rpc("creer_vehicule_esamba", {
      p_fleet_id: context.fleetId,
      p_registration: registration,
      p_brand: "Toyota",
      p_model: "Hiace",
      p_year: 2020,
      p_current_km: 120000,
    });

    expect(error).toBeNull();
    vehicleId = data as string;
  });

  afterAll(async () => {
    if (clients) {
      await cleanupFleetContext(clients.admin, context ?? { userId: clients.userId });
    }
  });

  it("detecte une surconsommation suspecte", () => {
    const consumption = computeFuelConsumptionLitersPer100km(45, 150);
    const anomaly = detectFuelAnomaly(consumption);

    expect(Math.round(consumption!)).toBe(30);
    expect(anomaly).toBe("high_consumption");
  });

  it("detecte un kilometrage invalide", () => {
    const consumption = computeFuelConsumptionLitersPer100km(20, 0);
    const anomaly = detectFuelAnomaly(consumption);

    expect(consumption).toBeNull();
    expect(anomaly).toBe("invalid_km");
  });

  it("verifie qu un vehicule test existe avant scoring reel", async () => {
    const { data, error } = await clients.admin
      .from("vehicules")
      .select("id,registration,current_km")
      .eq("id", vehicleId)
      .single();

    expect(error).toBeNull();
    expect(data?.registration).toBe(registration);
  });
});

if (!canRunIntegrationSuite) {
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingSupabaseIntegrationEnv().join(", ")})`,
  );
}
