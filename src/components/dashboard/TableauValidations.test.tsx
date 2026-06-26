import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { TableauValidations } from "@/components/dashboard/TableauValidations";
import type { CreneauValidationLigne } from "@/types/fleet-validation";

const useCreneauxValidationsMock = vi.fn();
const reviewMutateAsyncMock = vi.fn();
const refetchMock = vi.fn();

vi.mock("@/hooks/useFleetValidation", () => ({
  useCreneauxValidations: (...args: unknown[]) => useCreneauxValidationsMock(...args),
  useClosureProofSignedUrl: () => ({ data: null, isPending: false }),
}));

vi.mock("@/components/dashboard/ApercuPreuveCloture", () => ({
  ApercuPreuveCloture: () => <span data-testid="apercu-preuve">preuve</span>,
}));

vi.mock("@/hooks/useDriverShifts", () => ({
  useReviewClosure: () => ({
    mutateAsync: reviewMutateAsyncMock,
    isPending: false,
  }),
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
    cloture_revenue_declared: 50000,
    cloture_expected_revenue: 48000,
    cloture_revenue_gap: 2000,
    cloture_collection_mode: "cash",
    preuve_type: "momo_ref",
    preuve_valeur: "REF-123",
    preuve_mode_rendu: "reference",
    statut_global: "en_attente",
    ...overrides,
  };
}

describe("TableauValidations", () => {
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

  it("charge les validations pour la flotte donnée", () => {
    render(<TableauValidations fleetId="fleet-1" />);
    expect(useCreneauxValidationsMock).toHaveBeenCalledWith("fleet-1");
    expect(screen.getByText(/Aucun créneau ouvert à valider/i)).toBeInTheDocument();
  });

  it("permet de valider une clôture en attente", async () => {
    useCreneauxValidationsMock.mockReturnValue({
      data: [makeLigne()],
      isPending: false,
      refetch: refetchMock,
      isFetching: false,
    });

    render(<TableauValidations fleetId="fleet-1" />);

    expect(screen.getByText("LT-001-AA")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    expect(reviewMutateAsyncMock).toHaveBeenCalledWith({
      closureId: "closure-1",
      status: "validated",
    });
  });
});
