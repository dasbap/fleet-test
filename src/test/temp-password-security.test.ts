import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Temporary password security", () => {
  it("conserve au moins 144 bits aleatoires dans les chemins de provisioning production", () => {
    const prospectSource = readFileSync(
      "supabase/functions/create-prospect-account/index.ts",
      "utf8",
    );
    const fleetMemberSource = readFileSync(
      "supabase/functions/create-fleet-member-account/index.ts",
      "utf8",
    );
    const adminSource = readFileSync("api/admin/create-user.ts", "utf8");

    for (const source of [prospectSource, fleetMemberSource]) {
      expect(source).toContain("new Uint8Array(18)");
      expect(source).toContain("crypto.getRandomValues(bytes)");
      expect(source).toContain("btoa(String.fromCharCode(...bytes))");
      expect(source).not.toContain("byte % alphabet.length");
    }

    expect(adminSource).toContain('randomBytes(18).toString("base64url")');
  });

  it("interdit au provisionneur admin de choisir le mot de passe du nouveau compte", () => {
    const adminSource = readFileSync("api/admin/create-user.ts", "utf8");

    expect(adminSource).toContain('error: "password_must_not_be_provided"');
    expect(adminSource).toContain("must_set_password: true");
    expect(adminSource).toContain('password_delivery: "reset_email"');
    expect(adminSource).not.toContain("providedPassword || generateTempPassword()");
  });

  it("ne renvoie plus de mot de passe temporaire lors de la creation d'un membre de flotte", () => {
    const fleetMemberSource = readFileSync(
      "supabase/functions/create-fleet-member-account/index.ts",
      "utf8",
    );

    expect(fleetMemberSource).toContain('password_delivery: existingAuthUserAttached ? "existing_account" : "reset_email"');
    expect(fleetMemberSource).toContain("resetPasswordForEmail");
    expect(fleetMemberSource).toContain("temporary_password_active: true");
    expect(fleetMemberSource).not.toContain("temp_password:");
  });

  it("ne garde aucun chemin runtime admin qui distribue un mot de passe temporaire", () => {
    const adminDemoSource = readFileSync("src/server/http/routes/adminDemo.ts", "utf8");
    const adminProspectSource = readFileSync("src/server/http/routes/adminProspectSecurity.ts", "utf8");

    expect(adminDemoSource).not.toContain("/api/admin/create-prospect");
    expect(adminDemoSource).not.toContain("temp_password:");
    expect(adminProspectSource).toContain("resetPasswordForEmail");
    expect(adminProspectSource).toContain('password_delivery: "reset_email"');
    expect(adminProspectSource).not.toContain("temp_password:");
  });
});
