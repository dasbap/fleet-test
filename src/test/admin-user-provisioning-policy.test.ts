import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin user provisioning policy", () => {
  const apiSource = readFileSync("api/admin/create-user.ts", "utf8");
  const pageSource = readFileSync("src/pages/admin/AdminUsersPage.tsx", "utf8");

  it("ne permet pas au panel admin de creer un autre administrateur plateforme", () => {
    expect(apiSource).toContain('const VALID_ROLES = new Set(["organizer", "manager", "driver", "mechanic"])');
    expect(apiSource).toContain("forbidden_platform_admin_creation");
    expect(apiSource).not.toContain("makePlatformAdmin");
    expect(pageSource).not.toContain("platformAdmin");
    expect(pageSource).not.toContain("Donner aussi le statut administrateur plateforme");
  });

  it("autorise les organisateurs a creer des comptes uniquement dans leur flotte", () => {
    expect(apiSource).toContain("requireAccountProvisioner");
    expect(apiSource).toContain("assertCanProvisionFleetRole");
    expect(apiSource).toContain("forbidden_fleet_scope");
    expect(apiSource).toContain("created_by: auth.user.id");
  });
});
