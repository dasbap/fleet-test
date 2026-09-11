import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("super admin destructive actions", () => {
  const panel = readFileSync("src/components/admin/AllAccountsPanel.tsx", "utf8");
  const localRoutes = readFileSync("src/server/http/routes/adminDestructiveSecurity.ts", "utf8");
  const vercelDeleteUser = readFileSync("api/admin/delete-user.ts", "utf8");
  const vercelDeleteFleet = readFileSync("api/admin/delete-fleet.ts", "utf8");
  const app = readFileSync("src/server/http/app.ts", "utf8");

  it("affiche les suppressions de compte et de flotte uniquement au super admin", () => {
    expect(panel).toContain("useRoleAccess");
    expect(panel).toContain("isSuperAdmin");
    expect(panel).toContain("Supprimer compte");
    expect(panel).toContain("Supprimer flotte");
    expect(panel).toContain('/api/admin/delete-user');
    expect(panel).toContain('/api/admin/delete-fleet');
  });

  it("enregistre les routes destructives dans le BFF local", () => {
    expect(localRoutes).toContain('client.rpc("is_platform_super_admin")');
    expect(localRoutes).toContain('app.post("/api/admin/delete-user"');
    expect(localRoutes).toContain('app.post("/api/admin/delete-fleet"');
    expect(app).toContain("registerAdminDestructiveSecurityRoutes(app)");
  });

  it("laisse le super admin supprimer le compte et ses flottes sans garde organisateur", () => {
    expect(localRoutes).toContain("cannot_delete_current_super_admin");
    expect(localRoutes).toContain("cannot_delete_super_admin");
    expect(localRoutes).toContain("delete_owned_fleets_failed");
    expect(localRoutes).not.toContain("last_active_organizer_required");
    expect(localRoutes).not.toContain("delete_owned_demo_fleets");
    expect(vercelDeleteUser).toContain("delete_owned_fleets_failed");
    expect(vercelDeleteUser).not.toContain("last_active_organizer_required");
  });

  it("utilise la vraie colonne name pour la suppression de flotte locale et Vercel", () => {
    for (const source of [localRoutes, vercelDeleteFleet]) {
      expect(source).toContain("name");
      expect(source).not.toContain("fleet.nom");
      expect(source).toContain("fleet.name ?? null");
    }
    expect(localRoutes).toContain('.select("id,name")');
    expect(vercelDeleteFleet).toContain('.select("id,name,org_id")');
  });
});
