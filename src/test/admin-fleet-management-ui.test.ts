import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin fleet management UX", () => {
  it("affiche un onglet Flottes avec un workspace de gestion", () => {
    const page = readFileSync("src/pages/admin/DemoAdminPage.tsx", "utf8");
    const panel = readFileSync(
      "src/components/admin/AdminFleetManagementPanel.tsx",
      "utf8",
    );

    expect(page).toContain('value="fleets"');
    expect(page).toContain("Flottes");
    expect(page).toContain("<AdminFleetManagementPanel />");

    expect(panel).toContain("Rechercher une flotte");
    expect(panel).toContain("Ajouter un véhicule");
    expect(panel).toContain("Véhicules de la flotte");
    expect(panel).toContain("Réservations d'immatriculation");
    expect(panel).toContain("Enlever le verrou");
  });

  it("explique que la plaque supprimée reste réutilisable dans sa flotte", () => {
    const panel = readFileSync(
      "src/components/admin/AdminFleetManagementPanel.tsx",
      "utf8",
    );
    expect(panel).toContain(
      "Une plaque supprimée reste réservée à cette flotte et peut y être réutilisée.",
    );
  });

  it("garde les verrous visibles quand leur flotte a été supprimée", () => {
    const page = readFileSync("src/pages/admin/DemoAdminPage.tsx", "utf8");
    const locksPanel = readFileSync(
      "src/components/admin/AdminRegistrationLocksPanel.tsx",
      "utf8",
    );

    expect(page).toContain("<AdminRegistrationLocksPanel />");
    expect(locksPanel).toContain('p_fleet_id: null');
    expect(locksPanel).toContain("Flotte supprimée");
    expect(locksPanel).toContain("Seul un administrateur peut les libérer");
    expect(locksPanel).toContain("admin_release_vehicle_registration");
  });
});
