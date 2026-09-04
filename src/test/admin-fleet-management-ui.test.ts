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
});
