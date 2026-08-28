import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin user provisioning policy", () => {
  const apiSource = readFileSync("api/admin/create-user.ts", "utf8");
  const pageSource = readFileSync("src/pages/admin/AdminUsersPage.tsx", "utf8");

  it("reserve la creation d'admins plateforme au super admin", () => {
    expect(apiSource).toContain('const VALID_FLEET_ROLES = new Set(["organizer", "manager", "driver", "mechanic"])');
    expect(apiSource).toContain("is_platform_super_admin");
    expect(apiSource).toContain("forbidden_super_admin_required");
    expect(apiSource).toContain('internal_role: "admin"');
    expect(pageSource).toContain("isSuperAdmin");
    expect(pageSource).toContain("Admin plateforme");
    expect(pageSource).toContain("platform_admin: role === \"admin\"");
    expect(apiSource).not.toContain("makePlatformAdmin");
    expect(pageSource).not.toContain("Donner aussi le statut administrateur plateforme");
  });

  it("autorise les organisateurs a creer des comptes uniquement dans leur flotte", () => {
    expect(apiSource).toContain("requireAccountProvisioner");
    expect(apiSource).toContain("assertCanProvisionFleetRole");
    expect(apiSource).toContain("forbidden_fleet_scope");
    expect(apiSource).toContain("created_by: auth.user.id");
    expect(apiSource).toContain("role !== \"organizer\"");
    expect(apiSource).toContain("if (!platformAdminRequested && fleetId) {");
    expect(pageSource).toContain("useAuth");
    expect(pageSource).toContain("canProvisionAccounts");
    expect(pageSource).toContain("Flotte cible");
    expect(pageSource).toContain("role !== \"organizer\"");
    expect(pageSource).toContain("l'organisateur finalisera sa flotte sur /start");
    expect(pageSource).not.toContain("Fleet ID optionnel");
    expect(pageSource).not.toContain("reservee aux administrateurs E-Samba");
  });
});
