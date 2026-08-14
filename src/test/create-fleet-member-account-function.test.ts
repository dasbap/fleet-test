import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/create-fleet-member-account/index.ts"),
  "utf8",
);

describe("create-fleet-member-account Edge Function", () => {
  it("checks the active organizer count before creating an organizer account", () => {
    const countCheckIndex = functionSource.indexOf("active_organizer_limit_reached");
    const createUserIndex = functionSource.indexOf("auth.admin.createUser");

    expect(countCheckIndex).toBeGreaterThan(-1);
    expect(createUserIndex).toBeGreaterThan(-1);
    expect(countCheckIndex).toBeLessThan(createUserIndex);
    expect(functionSource).toContain('.eq("role", "organizer")');
    expect(functionSource).toContain("count: \"exact\"");
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
});
