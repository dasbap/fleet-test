import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemoAccountsPanel } from "@/components/admin/DemoAccountsPanel";

vi.mock("@/hooks/useDemoLegacyProfiles", () => ({
  useDemoLegacyProfiles: () => ({
    profiles: [
      {
        user_id: "00000000-0000-4000-8000-000000000001",
        email: "prospect@example.com",
        account_type: "prospect",
        is_active: true,
        expires_at: null,
        notified_at: null,
        deactivated_at: null,
        created_at: "2026-07-22T10:00:00.000Z",
      },
    ],
    isLoading: false,
    reload: vi.fn(),
    reactivate: vi.fn(),
    deactivate: vi.fn(),
  }),
}));

describe("DemoAccountsPanel", () => {
  it("affiche l'email et presente une expiration nulle comme un acces permanent", () => {
    render(<DemoAccountsPanel currentAdminId="00000000-0000-4000-8000-000000000099" />);

    expect(screen.getByText("prospect@example.com")).toBeInTheDocument();
    expect(screen.getByText("Permanent")).toBeInTheDocument();
    expect(screen.queryByText("Expiration non renseignee")).not.toBeInTheDocument();
  });
});
