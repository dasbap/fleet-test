import { describe, expect, it } from "vitest";
import {
  canRunIntegrationAuthBootstrap,
  getMissingAuthEnv,
  bootstrapIntegrationAuth,
} from "./_auth";

const canRunIntegrationSuite = canRunIntegrationAuthBootstrap();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration("RLS - acces flotte", () => {
  it("verifie que la flotte test existe", async () => {
    const { admin: supabaseAdmin } = await bootstrapIntegrationAuth();

    const { data, error } = await supabaseAdmin
      .from("flottes")
      .select("id,name")
      .eq("name", "TEST Flotte Taxi Yaoundé")
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe("TEST Flotte Taxi Yaoundé");
  });

  it("verifie que les vehicules test sont visibles cote service role", async () => {
    const { admin: supabaseAdmin } = await bootstrapIntegrationAuth();

    const { data, error } = await supabaseAdmin
      .from("vehicules")
      .select("registration")
      .like("registration", "TEST-YAO-%");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(3);
  });
});

if (!canRunIntegrationSuite) {
  // Commentaire explicite dans la sortie Vitest quand la suite est ignoree.
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingAuthEnv().join(", ")})`,
  );
}
