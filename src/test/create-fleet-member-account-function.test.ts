import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-fleet-member-account/index.ts"),
  "utf8",
);

describe("create-fleet-member-account Edge Function", () => {
  it("checks the active organizer count before inviting an organizer account", () => {
    const countCheckIndex = functionSource.indexOf("active_organizer_limit_reached");
    const inviteUserIndex = functionSource.indexOf("auth.admin.inviteUserByEmail");

    expect(countCheckIndex).toBeGreaterThan(-1);
    expect(inviteUserIndex).toBeGreaterThan(-1);
    expect(countCheckIndex).toBeLessThan(inviteUserIndex);
    expect(functionSource).toContain('.eq("role", "organizer")');
    expect(functionSource).toContain("count: \"exact\"");
  });

  it("sends a Supabase verification invite back to the web account", () => {
    expect(functionSource).toContain("auth.admin.inviteUserByEmail");
    expect(functionSource).toContain('redirectTo: `${appOrigin}/auth/callback`');
    expect(functionSource).toContain('email_delivery: existingAuthUserAttached ? "existing_account" : "verification_invite"');
    expect(functionSource).toContain("email_verification_required: !existingAuthUserAttached");
    expect(functionSource).toContain('resolveAppOrigin(body.app_origin ?? req.headers.get("origin"))');
    expect(functionSource).not.toContain("email_confirm: true");
  });

  it("reattaches an existing auth user instead of failing on duplicate email", () => {
    const duplicateBranchIndex = functionSource.indexOf("email_already_registered");
    const listUsersIndex = functionSource.indexOf("auth.admin.listUsers");
    const membershipUpsertIndex = functionSource.indexOf('{ onConflict: "fleet_id,user_id" }');

    expect(duplicateBranchIndex).toBeGreaterThan(-1);
    expect(listUsersIndex).toBeGreaterThan(-1);
    expect(membershipUpsertIndex).toBeGreaterThan(-1);
    expect(listUsersIndex).toBeLessThan(membershipUpsertIndex);
    expect(functionSource).toContain("existing_auth_user_attached");
  });

  it("does not overwrite a global profile when attaching an existing account", () => {
    const existingBranch = functionSource.indexOf("if (existingAuthUserAttached) {");
    const newUserProfileBranch = functionSource.indexOf("} else {\n    const { error: profileErr }");
    const profileUpsert = functionSource.indexOf('admin.from("profils").upsert');

    expect(existingBranch).toBeGreaterThan(-1);
    expect(newUserProfileBranch).toBeGreaterThan(existingBranch);
    expect(profileUpsert).toBeGreaterThan(newUserProfileBranch);
    expect(functionSource).toContain("already_fleet_member");
    expect(functionSource).toContain("target_membership_check_failed");
  });

  it("prevents managers from changing the role of an inactive existing membership", () => {
    expect(functionSource).toContain("existingMembership.role !== role");
    expect(functionSource).toContain('callerRole !== "organizer"');
    expect(functionSource).toContain('error: "forbidden_role_assignment"');
  });
});
