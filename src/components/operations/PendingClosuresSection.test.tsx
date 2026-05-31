import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PendingClosuresSection } from "@/components/operations/PendingClosuresSection";
import { makePendingClosure } from "@/test/fixtures/fleetCompliance.fixtures";

const usePendingClosuresMock = vi.fn();
const reviewMutateMock = vi.fn();

vi.mock("@/hooks/useFleetCompliance", () => ({
  usePendingClosures: (...args: unknown[]) => usePendingClosuresMock(...args),
}));

vi.mock("@/hooks/useDriverShifts", () => ({
  useReviewClosure: () => ({
    mutate: reviewMutateMock,
    isPending: false,
  }),
}));

describe("PendingClosuresSection", () => {
  beforeEach(() => {
    usePendingClosuresMock.mockReset();
    reviewMutateMock.mockReset();
    usePendingClosuresMock.mockReturnValue({ data: [], isPending: false });
  });

  it("affiche l'état vide sans clôture en attente", () => {
    render(<PendingClosuresSection fleetId="fleet-1" />);
    expect(screen.getByText("Clôtures à valider")).toBeInTheDocument();
    expect(screen.getByText("Aucune clôture en attente de validation.")).toBeInTheDocument();
  });

  it("affiche les détails et permet la validation", () => {
    usePendingClosuresMock.mockReturnValue({
      data: [makePendingClosure()],
      isPending: false,
    });

    render(<PendingClosuresSection fleetId="fleet-1" />);

    expect(screen.getByText("LT-001-AA")).toBeInTheDocument();
    expect(screen.getByText(/Jean Kouassi/)).toBeInTheDocument();
    expect(screen.getByText(/45[\s\u00a0]?000 FCFA/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(reviewMutateMock).toHaveBeenCalledWith({
      closureId: "closure-1",
      status: "validated",
    });
  });

  it("permet le rejet d'une clôture", () => {
    usePendingClosuresMock.mockReturnValue({
      data: [makePendingClosure()],
      isPending: false,
    });

    render(<PendingClosuresSection fleetId="fleet-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Rejeter/i }));
    expect(reviewMutateMock).toHaveBeenCalledWith({
      closureId: "closure-1",
      status: "rejected",
    });
  });
});
