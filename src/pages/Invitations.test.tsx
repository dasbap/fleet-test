import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Invitations from "./Invitations";

const useAuthMock = vi.fn();
const usePermissionsMock = vi.fn();
const useInvitationsMock = vi.fn();
const useDeleteInvitationMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => usePermissionsMock(),
}));

vi.mock("@/hooks/useInvitations", () => ({
  useInvitations: () => useInvitationsMock(),
  useDeleteInvitation: () => useDeleteInvitationMock(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/invitations/CreateInvitationDialog", () => ({
  CreateInvitationDialog: () => null,
}));

describe("Invitations", () => {
  it("place les actions sous le titre sur mobile", () => {
    useAuthMock.mockReturnValue({
      user: { id: "user-1" },
      role: "gestionnaire",
      userFleetId: "fleet-1",
      isLoading: false,
    });
    usePermissionsMock.mockReturnValue({ canAccessBackoffice: true });
    useInvitationsMock.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });
    useDeleteInvitationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Invitations />
      </MemoryRouter>,
    );

    const title = screen.getByRole("heading", { name: /gestion des invitations/i });
    const header = title.parentElement?.parentElement;
    expect(header).not.toBeNull();

    const createButton = within(header as HTMLElement).getByRole("button", {
      name: /créer une invitation/i,
    });
    const actions = createButton.parentElement;

    expect(header).toHaveClass("flex-col");
    expect(header).not.toHaveClass("sm:flex-row", "lg:flex-row");
    expect(actions).toHaveClass("w-full", "flex-col");
    expect(actions).not.toHaveClass("sm:flex-row");
    expect(actions).not.toHaveClass("lg:flex-row");
    expect(createButton).toHaveClass("w-full");
    expect(createButton).not.toHaveClass("sm:w-auto", "lg:w-auto");
  });
});
