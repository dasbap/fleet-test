import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Navbar from "@/components/landing/Navbar";

vi.mock("@/hooks/useAuth", () => ({
  useAuthOptional: () => null,
}));

describe("Navbar", () => {
  it("affiche la connexion sans CTA auth primaire pour les visiteurs", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Connexion" })).toHaveAttribute("href", "/auth");
    expect(screen.queryByRole("link", { name: /Demander un acces/i })).not.toBeInTheDocument();
  });
});
