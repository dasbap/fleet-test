import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deleteUserApi = readFileSync("api/admin/delete-user.ts", "utf8");
const deleteFleetApi = readFileSync("api/admin/delete-fleet.ts", "utf8");
const usersPage = readFileSync("src/pages/admin/AdminUsersPage.tsx", "utf8");
const subscriptionsPage = readFileSync("src/pages/admin/AdminSubscriptionsPage.tsx", "utf8");

describe("super admin destructive actions", () => {
  it("requires super admin server-side for account deletion", () => {
    expect(deleteUserApi).toContain('rpc("is_platform_super_admin")');
    expect(deleteUserApi).toContain("forbidden_super_admin_required");
    expect(deleteUserApi).toContain("cannot_delete_current_super_admin");
    expect(deleteUserApi).toContain("cannot_delete_super_admin");
    expect(deleteUserApi).toContain("admin.auth.admin.deleteUser(userId)");
  });

  it("requires super admin server-side for fleet deletion", () => {
    expect(deleteFleetApi).toContain('rpc("is_platform_super_admin")');
    expect(deleteFleetApi).toContain("forbidden_super_admin_required");
    expect(deleteFleetApi).toContain('.from("flottes").delete().eq("id", fleetId)');
  });

  it("shows account deletion only to super admins", () => {
    expect(usersPage).toContain("{isSuperAdmin ? (");
    expect(usersPage).toContain('fetch("/api/admin/delete-user"');
    expect(usersPage).toContain("Supprimer définitivement le compte");
  });

  it("keeps fleet deletion inside the super-admin-only subscriptions page", () => {
    expect(subscriptionsPage).toContain("if (!isSuperAdmin)");
    expect(subscriptionsPage).toContain('fetch("/api/admin/delete-fleet"');
    expect(subscriptionsPage).toContain("Zone de suppression super admin");
  });
});
