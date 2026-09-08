import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fleet deletion placement", () => {
  const subscriptionsPage = readFileSync("src/pages/admin/AdminSubscriptionsPage.tsx", "utf8");
  const fleetPanel = readFileSync("src/components/admin/AdminFleetManagementPanel.tsx", "utf8");

  it("ne propose plus la suppression de flotte dans la page abonnements", () => {
    expect(subscriptionsPage).not.toContain("/api/admin/delete-fleet");
    expect(subscriptionsPage).not.toContain("Zone de suppression super admin");
    expect(subscriptionsPage).not.toContain("Supprimer la flotte");
  });

  it("place la suppression dans la liste de gestion des flottes pour le super admin", () => {
    expect(fleetPanel).toContain("useRoleAccess");
    expect(fleetPanel).toContain("isSuperAdmin");
    expect(fleetPanel).toContain('/api/admin/delete-fleet');
    expect(fleetPanel).toContain("aria-label={`Supprimer la flotte ${fleet.name}`}");
    expect(fleetPanel).toContain("fleetDeleteTarget");
    expect(fleetPanel).toContain("Supprimer la flotte");
  });
});
