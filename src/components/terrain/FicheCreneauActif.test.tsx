import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FicheCreneauActif } from "@/components/terrain/FicheCreneauActif";
import type { CreneauValidationLigne } from "@/types/fleet-validation";

const useCreneauActifValidationMock = vi.fn();

vi.mock("@/hooks/useFleetValidation", () => ({
  useCreneauActifValidation: (...args: unknown[]) => useCreneauActifValidationMock(...args),
}));

function makeDonnees(overrides: Partial<CreneauValidationLigne> = {}): CreneauValidationLigne {
  return {
    creneau_id: "creneau-1",
    fleet_id: "fleet-1",
    registration: "LT-001-AA",
    brand: "Toyota",
    model: "Hiace",
    statut_creneau: "open",
    started_at: "2026-06-25T08:00:00.000Z",
    km_start: 45230,
    current_km: 45400,
    dvir_pre_count: 1,
    dvir_pre_statut: "ok",
    dvir_post_count: 0,
    dvir_post_statut: null,
    carburant_saisies: 1,
    carburant_litres_total: 40,
    carburant_xof_total: 25000,
    cloture_id: null,
    cloture_statut: null,
    cloture_revenue_declared: null,
    cloture_expected_revenue: null,
    cloture_revenue_gap: null,
    cloture_collection_mode: null,
    preuve_type: null,
    preuve_valeur: null,
    preuve_mode_rendu: "inconnu",
    statut_global: "incomplet",
    ...overrides,
  };
}

describe("FicheCreneauActif", () => {
  it("affiche le chargement pendant la récupération du créneau", () => {
    useCreneauActifValidationMock.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    });

    render(<FicheCreneauActif creneauId="creneau-1" />);

    expect(screen.getByText(/Chargement des données du créneau/i)).toBeInTheDocument();
    expect(useCreneauActifValidationMock).toHaveBeenCalledWith("creneau-1");
  });

  it("affiche les validations DVIR et carburant", () => {
    useCreneauActifValidationMock.mockReturnValue({
      data: makeDonnees(),
      isPending: false,
      isError: false,
    });

    render(<FicheCreneauActif creneauId="creneau-1" />);

    expect(screen.getByText(/Détails du créneau en cours/i)).toBeInTheDocument();
    expect(screen.getByText("LT-001-AA")).toBeInTheDocument();
    expect(screen.getByText(/DVIR pré-trip/i)).toBeInTheDocument();
    expect(screen.getByText(/Saisie carburant/i)).toBeInTheDocument();
  });

  it("affiche un message si le créneau est introuvable", () => {
    useCreneauActifValidationMock.mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
    });

    render(<FicheCreneauActif creneauId="creneau-inconnu" />);

    expect(screen.getByText(/Impossible de charger les données du créneau/i)).toBeInTheDocument();
  });
});
