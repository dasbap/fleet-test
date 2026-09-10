import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Temporary password security", () => {
  it("conserve au moins 144 bits aleatoires dans les chemins qui utilisent encore un mot de passe temporaire", () => {
    const prospectSource = readFileSync(
      "supabase/functions/create-prospect-account/index.ts",
      "utf8",
    );
    const adminSource = readFileSync("api/admin/create-user.ts", "utf8");

    expect(prospectSource).toContain("new Uint8Array(18)");
    expect(prospectSource).toContain("crypto.getRandomValues(bytes)");
    expect(prospectSource).toContain("btoa(String.fromCharCode(...bytes))");
    expect(prospectSource).not.toContain("byte % alphabet.length");
    expect(adminSource).toContain('randomBytes(18).toString("base64url")');
  });

  it("interdit au provisionneur admin de choisir le mot de passe du nouveau compte", () => {
    const adminSource = readFileSync("api/admin/create-user.ts", "utf8");

    expect(adminSource).toContain('error: "password_must_not_be_provided"');
    expect(adminSource).toContain("must_set_password: true");
    expect(adminSource).toContain('password_delivery: "reset_email"');
    expect(adminSource).not.toContain("providedPassword || generateTempPassword()");
  });

  it("provisionne un membre de flotte par invitation verifiee sans mot de passe temporaire", () => {
    const fleetMemberSource = readFileSync(
      "supabase/functions/create-fleet-member-account/index.ts",
      "utf8",
    );

    expect(fleetMemberSource).toContain("auth.admin.inviteUserByEmail");
    expect(fleetMemberSource).toContain('redirectTo: `${appOrigin}/auth/callback`');
    expect(fleetMemberSource).toContain('email_delivery: existingAuthUserAttached ? "existing_account" : "verification_invite"');
    expect(fleetMemberSource).not.toContain("request-password-reset");
    expect(fleetMemberSource).not.toContain("temporary_password_active");
    expect(fleetMemberSource).not.toContain("temp_password:");
  });

  it("ne garde aucun chemin runtime admin qui distribue un mot de passe temporaire", () => {
    const adminDemoSource = readFileSync("src/server/http/routes/adminDemo.ts", "utf8");
    const adminProspectSource = readFileSync("src/server/http/routes/adminProspectSecurity.ts", "utf8");

    expect(adminDemoSource).not.toContain("/api/admin/create-prospect");
    expect(adminDemoSource).not.toContain("temp_password:");
    expect(adminProspectSource).toContain("request-password-reset");
    expect(adminProspectSource).toContain("sendScannerSafePasswordSetupEmail");
    expect(adminProspectSource).toContain('password_delivery: passwordDelivery.ok ? "reset_email" : "pending"');
    expect(adminProspectSource).not.toContain("resetPasswordForEmail");
    expect(adminProspectSource).not.toContain("temp_password:");
  });
});
