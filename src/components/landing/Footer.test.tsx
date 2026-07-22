import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Footer from "@/components/landing/Footer";

describe("Footer", () => {
  it("reste minimal et limite aux liens essentiels", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /E-Samba/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Confidentialite" })).toHaveAttribute(
      "href",
      "/confidentialite",
    );
    expect(screen.getByRole("link", { name: "Conditions" })).toHaveAttribute(
      "href",
      "/conditions",
    );

    expect(screen.queryByRole("heading", { name: "Produit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entreprise" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Support" })).not.toBeInTheDocument();
    expect(screen.queryByText(/gestion de flotte intelligente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Made with/i)).not.toBeInTheDocument();
  });
});
