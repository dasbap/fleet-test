import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CreateInvitationDialog } from "./CreateInvitationDialog";

const useAuthMock = vi.fn();
const useFleetMembersMock = vi.fn();
const useCreateFleetMemberAccountMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useFleetMembers", () => ({
  useFleetMembers: (fleetId?: string) => useFleetMembersMock(fleetId),
  useCreateFleetMemberAccount: () => useCreateFleetMemberAccountMock(),
}));

describe("CreateInvitationDialog", () => {
  it("ne propose pas le rôle organisateur quand la flotte en a déjà un actif", () => {
    useAuthMock.mockReturnValue({
      user: { id: "organizer-1" },
      role: "organizer",
    });
    useFleetMembersMock.mockReturnValue({
      data: [
        {
          id: "membership-1",
          user_id: "organizer-1",
          fleet_id: "fleet-1",
          role: "organizer",
          is_active: true,
          created_at: "2026-08-04T00:00:00.000Z",
          profile: { full_name: "Organisateur", phone: null },
          email: "owner@example.com",
        },
      ],
      isLoading: false,
    });
    useCreateFleetMemberAccountMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CreateInvitationDialog
          open
          onOpenChange={vi.fn()}
          fleetId="fleet-1"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("option", { name: "Organisateur" })).not.toBeInTheDocument();
    expect(screen.getByText(/un organisateur actif existe déjà/i)).toBeInTheDocument();
  });
});
