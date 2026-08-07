import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileAlertsPage from "@/features/alerts/screens/MobileAlertsPage";
import type { Alert } from "@/types/alert";

const mocks = vi.hoisted(() => ({
  alerts: [] as Alert[],
  submitQuestion: vi.fn(),
  resolveAlert: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    userFleetId: "fleet-1",
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAlerts", () => ({
  useAlertsList: () => ({
    data: mocks.alerts,
    isLoading: false,
  }),
  useResolveAlert: () => ({
    isPending: false,
    mutateAsync: mocks.resolveAlert,
  }),
}));

vi.mock("@/hooks/useExpiringDocuments", () => ({
  useExpiringDocuments: () => ({
    criticalCount: 0,
    expired: [],
    expiringSoon: [],
  }),
}));

vi.mock("@/hooks/useFaqQuestions", () => ({
  useSubmitFaqQuestion: () => ({
    isPending: false,
    mutateAsync: mocks.submitQuestion,
  }),
}));

const faqAnswerAlert: Alert = {
  id: "alert-1",
  fleetId: "fleet-1",
  vehicleId: null,
  type: "faq_answer",
  title: "faq answer",
  message: "Question FAQ: Comment activer ?\n\nReponse admin: Depuis le dashboard.",
  severity: "info",
  status: "open",
  createdAt: "2026-08-03T10:00:00Z",
  updatedAt: "2026-08-03T10:00:00Z",
  resolvedAt: null,
  faqQuestionId: "question-1",
};

describe("MobileAlertsPage", () => {
  beforeEach(() => {
    mocks.alerts = [faqAnswerAlert];
    mocks.submitQuestion.mockReset();
    mocks.resolveAlert.mockReset();
  });

  it("permet de reposer une question depuis une reponse FAQ admin et de marquer l'alerte lue", async () => {
    render(<MobileAlertsPage />);

    fireEvent.click(screen.getByRole("button", { name: /reposer une question/i }));
    fireEvent.change(screen.getByLabelText(/nouvelle question/i), {
      target: { value: "Je n'ai pas compris la premiere reponse." },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer la relance/i }));

    await waitFor(() =>
      expect(mocks.submitQuestion).toHaveBeenCalledWith({
        question: "Je n'ai pas compris la premiere reponse.",
        parentQuestionId: "question-1",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /marquer comme lu/i }));

    await waitFor(() =>
      expect(mocks.resolveAlert).toHaveBeenCalledWith({
        alertId: "alert-1",
        resolvedBy: "user-1",
      }),
    );
  });
});
