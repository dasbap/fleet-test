import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FaqQuestionForm } from "@/components/faq/FaqQuestionForm";

const mockUseAuthOptional = vi.fn();
const mockUseRoleAccess = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuthOptional: () => mockUseAuthOptional(),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => mockUseRoleAccess(),
}));

vi.mock("@/hooks/useFaqQuestions", () => ({
  useSubmitFaqQuestion: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <FaqQuestionForm />
    </MemoryRouter>,
  );
}

describe("FaqQuestionForm", () => {
  beforeEach(() => {
    mockUseAuthOptional.mockReturnValue({ user: { id: "user-1" } });
    mockUseRoleAccess.mockReturnValue({
      isAdmin: false,
      isSuperAdmin: false,
      isLoading: false,
    });
  });

  it("affiche le formulaire pour un utilisateur connecte non admin", () => {
    renderForm();

    expect(screen.getByLabelText(/poser une question/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /envoyer la question/i })).toBeInTheDocument();
  });

  it("masque le formulaire FAQ pour un admin plateforme", () => {
    mockUseRoleAccess.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: false,
      isLoading: false,
    });

    renderForm();

    expect(screen.queryByLabelText(/poser une question/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /envoyer la question/i })).not.toBeInTheDocument();
    expect(screen.getByText(/les admins repondent aux questions depuis le module admin/i)).toBeInTheDocument();
  });

  it("masque le formulaire FAQ pour un super admin", () => {
    mockUseRoleAccess.mockReturnValue({
      isAdmin: true,
      isSuperAdmin: true,
      isLoading: false,
    });

    renderForm();

    expect(screen.queryByLabelText(/poser une question/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ouvrir le module faq admin/i })).toHaveAttribute(
      "href",
      "/dashboard/admin/faq",
    );
  });
});
