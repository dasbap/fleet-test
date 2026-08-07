import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminFaqPage from "@/pages/admin/AdminFaqPage";

const mockAnswerMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockDeleteFaqArticleMutateAsync = vi.fn();

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

vi.mock("@/hooks/useHelpArticles", () => ({
  useAdminFaqEntries: () => ({
    data: [
      {
        id: "faq-article-1",
        slug: "gestion-flotte",
        title: "Comment gerer ma flotte ?",
        category: "faq",
        role: [],
        locale: "fr",
        keywords: [],
        content: "Depuis le dashboard, ouvrez le menu Flottes.",
        route_context: ["/faq"],
        plan_min: null,
        module_keys: [],
        error_codes: [],
        sort_order: 1,
        is_published: true,
        created_at: "2026-08-03T10:00:00.000Z",
        updated_at: "2026-08-03T10:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
  useSaveFaqArticle: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteFaqArticle: () => ({ isPending: false, mutateAsync: mockDeleteFaqArticleMutateAsync }),
}));

vi.mock("@/hooks/useFaqQuestions", () => ({
  useAdminFaqQuestions: () => ({
    data: [
      {
        id: "question-1",
        user_id: "user-1",
        user_email: "client@example.com",
        user_name: "Client Test",
        parent_question_id: null,
        question: "Comment ajouter une flotte secondaire ?",
        status: "open",
        answer: null,
        answered_by: null,
        answered_at: null,
        created_at: "2026-08-03T10:00:00.000Z",
      },
    ],
    isLoading: false,
  }),
  useAnswerFaqQuestion: () => ({ isPending: false, mutateAsync: mockAnswerMutateAsync }),
  useDeleteFaqQuestion: () => ({ isPending: false, mutateAsync: mockDeleteMutateAsync }),
}));

describe("AdminFaqPage", () => {
  beforeEach(() => {
    mockAnswerMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
    mockDeleteFaqArticleMutateAsync.mockReset();
  });

  it("affiche le module admin de reponse aux questions utilisateurs", () => {
    render(<AdminFaqPage />);

    expect(screen.getByRole("tab", { name: /questions utilisateurs/i })).toBeInTheDocument();
    expect(screen.getByText("Client Test")).toBeInTheDocument();
    expect(screen.getByText("client@example.com")).toBeInTheDocument();
    expect(screen.getByText("Comment ajouter une flotte secondaire ?")).toBeInTheDocument();
    expect(screen.getByLabelText(/reponse admin/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /envoyer la reponse/i })).toBeDisabled();
  });

  it("envoie la reponse admin pour la question selectionnee", () => {
    mockAnswerMutateAsync.mockReturnValue(new Promise(() => {}));
    render(<AdminFaqPage />);

    fireEvent.change(screen.getByLabelText(/reponse admin/i), {
      target: { value: "Ajoutez une flotte depuis le menu Flottes puis Nouvelle flotte." },
    });
    fireEvent.click(screen.getByRole("button", { name: /envoyer la reponse/i }));

    expect(mockAnswerMutateAsync).toHaveBeenCalledWith({
      questionId: "question-1",
      answer: "Ajoutez une flotte depuis le menu Flottes puis Nouvelle flotte.",
    });
  });

  it("permet a un admin de supprimer une question FAQ utilisateur", async () => {
    render(<AdminFaqPage />);

    fireEvent.click(screen.getByRole("button", { name: /supprimer la question/i }));

    await waitFor(() =>
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith({ questionId: "question-1" }),
    );
  });

  it("permet a un admin de supprimer une FAQ publique", async () => {
    render(<AdminFaqPage />);

    fireEvent.pointerDown(screen.getByRole("tab", { name: /faq publique/i }));
    fireEvent.click(screen.getByRole("button", { name: /comment gerer ma flotte/i, hidden: true }));
    const formActions = screen.getByTestId("public-faq-form-actions");

    expect(formActions).toContainElement(screen.getByRole("button", { name: /sauvegarder/i }));
    expect(formActions).toContainElement(
      screen.getByRole("button", { name: /supprimer la faq publique/i }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /supprimer la faq publique/i }),
    );

    await waitFor(() =>
      expect(mockDeleteFaqArticleMutateAsync).toHaveBeenCalledWith({ articleId: "faq-article-1" }),
    );
  });
});
