import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduledReportsPage from "./ScheduledReportsPage";

const createMutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userFleetId: "fleet-1",
    user: { id: "user-1" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useScheduledReports", () => ({
  useScheduledReports: () => ({ data: [], isLoading: false }),
  useCreateScheduledReport: () => ({ mutate: createMutate, isPending: false }),
  useToggleScheduledReport: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteScheduledReport: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("ScheduledReportsPage", () => {
  it("affiche une erreur visible quand aucun destinataire n'est fourni", async () => {
    render(<ScheduledReportsPage />);

    fireEvent.click(screen.getByRole("button", { name: /nouveau rapport/i }));
    fireEvent.click(screen.getByRole("button", { name: /créer le rapport/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/ajoutez au moins un destinataire/i);
    expect(createMutate).not.toHaveBeenCalled();
  });
});
