import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PendingClosuresSection } from "@/components/operations/PendingClosuresSection";
import type { CreneauValidationLigne } from "@/types/fleet-validation";

const useCreneauxValidationsMock = vi.fn();
const reviewMutateAsyncMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("@/hooks/useFleetValidation", () => ({
  useCreneauxValidations: (...args: unknown[]) => useCreneauxValidationsMock(...args),
}));

vi.mock("@/hooks/useDriverShifts", () => ({
  useReviewClosure: () => ({
    mutateAsync: reviewMutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock("@/components/dashboard/ApercuPreuveCloture", () => ({
  ApercuPreuveCloture: () => <span>preuve</span>,
}));

function makeLigne(overrides: Partial<CreneauValidationLigne> = {}): CreneauValidationLigne {
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
    dvir_post_count: 1,
    dvir_post_statut: "ok",
    carburant_saisies: 1,
    carburant_litres_total: 40,
    carburant_xof_total: 25000,
    cloture_id: "closure-1",
    cloture_statut: "pending",
    cloture_revenue_declared: 45000,
    cloture_expected_revenue: 44000,
    cloture_revenue_gap: 1000,
    cloture_collection_mode: "cash",
    preuve_type: null,
    preuve_valeur: null,
    preuve_mode_rendu: "inconnu",
    statut_global: "en_attente",
    ...overrides,
  };
}

describe("PendingClosuresSection", () => {
  beforeEach(() => {
    useCreneauxValidationsMock.mockReset();
    reviewMutateAsyncMock.mockReset();
    refetchMock.mockReset();
    reviewMutateAsyncMock.mockResolvedValue(undefined);
    useCreneauxValidationsMock.mockReturnValue({
      data: [],
      isPending: false,
      refetch: refetchMock,
      isFetching: false,
    });
  });

  it("affiche l'état vide sans clôture en attente", () => {
    render(<PendingClosuresSection fleetId="fleet-1" />);
    expect(screen.getByText("Clôtures à valider")).toBeInTheDocument();
    expect(screen.getByText(/Aucun créneau ouvert à valider/i)).toBeInTheDocument();
  });

  it("affiche les détails et permet la validation", async () => {
    useCreneauxValidationsMock.mockReturnValue({
      data: [makeLigne()],
      isPending: false,
      refetch: refetchMock,
      isFetching: false,
    });

    render(<PendingClosuresSection fleetId="fleet-1" />);

    expect(screen.getByText("LT-001-AA")).toBeInTheDocument();
    expect(screen.getByText(/45[\s\u00a0]?000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    expect(reviewMutateAsyncMock).toHaveBeenCalledWith({
      closureId: "closure-1",
      status: "validated",
    });
  });

  it("permet le rejet d'une clôture", async () => {
    useCreneauxValidationsMock.mockReturnValue({
      data: [makeLigne()],
      isPending: false,
      refetch: refetchMock,
      isFetching: false,
    });

    render(<PendingClosuresSection fleetId="fleet-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Rejeter" }));
    expect(reviewMutateAsyncMock).toHaveBeenCalledWith({
      closureId: "closure-1",
      status: "rejected",
    });
  });
});
