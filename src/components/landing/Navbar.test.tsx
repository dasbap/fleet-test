import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Navbar from "@/components/landing/Navbar";
import { AUTH_NAV } from "@/config/navigation";

vi.mock("@/hooks/useAuth", () => ({
  useAuthOptional: () => null,
}));

describe("Navbar", () => {
  it("affiche la connexion et le CTA auth primaire pour les visiteurs", () => {
    const primaryAuth = AUTH_NAV.find((item) => item.primary);
    expect(primaryAuth).toBeDefined();

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/auth");
    expect(screen.getByRole("link", { name: primaryAuth!.label })).toHaveAttribute(
      "href",
      primaryAuth!.href,
    );
  });
});
