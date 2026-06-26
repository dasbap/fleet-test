import { describe, expect, it } from "vitest";
import { calculerStatutValidation } from "@/services/fleet-validation.service";
import type { CreneauValidationRow } from "@/types/fleet-validation";

function makeRow(overrides: Partial<CreneauValidationRow> = {}): CreneauValidationRow {
  return {
    creneau_id: "c1",
    fleet_id: "f1",
    registration: "LT-001",
    brand: "Toyota",
    model: "Hiace",
    statut_creneau: "open",
    started_at: "2026-06-25T08:00:00.000Z",
    km_start: 1000,
    current_km: 1100,
    dvir_pre_count: 0,
    dvir_pre_statut: null,
    dvir_post_count: 0,
    dvir_post_statut: null,
    carburant_saisies: 0,
    carburant_litres_total: 0,
    carburant_xof_total: 0,
    cloture_id: null,
    cloture_statut: null,
    cloture_revenue_declared: null,
    cloture_expected_revenue: null,
    cloture_revenue_gap: null,
    cloture_collection_mode: null,
    preuve_type: null,
    preuve_valeur: null,
    preuve_mode_rendu: "inconnu",
    ...overrides,
  };
}

describe("calculerStatutValidation", () => {
  it("retourne alerte sans DVIR pré", () => {
    expect(calculerStatutValidation(makeRow())).toBe("alerte");
  });

  it("retourne incomplet si étapes partielles", () => {
    expect(
      calculerStatutValidation(
        makeRow({ dvir_pre_count: 1, carburant_saisies: 1, dvir_post_count: 0 }),
      ),
    ).toBe("incomplet");
  });

  it("retourne en_attente si tout est saisi mais clôture non validée", () => {
    expect(
      calculerStatutValidation(
        makeRow({
          dvir_pre_count: 1,
          carburant_saisies: 1,
          dvir_post_count: 1,
          cloture_statut: "pending",
        }),
      ),
    ).toBe("en_attente");
  });

  it("retourne complet si clôture validée", () => {
    expect(
      calculerStatutValidation(
        makeRow({
          dvir_pre_count: 1,
          carburant_saisies: 1,
          dvir_post_count: 1,
          cloture_statut: "validated",
        }),
      ),
    ).toBe("complet");
  });
});
