import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionErrorBoundary } from "@/components/errors/SectionErrorBoundary";

function BrokenChild(): never {
  throw new Error("crash test");
}

describe("SectionErrorBoundary", () => {
  it("affiche un fallback utilisateur sans stack trace", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SectionErrorBoundary sectionLabel="la page véhicules">
        <BrokenChild />
      </SectionErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Impossible d'afficher la page véhicules/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
    expect(screen.queryByText(/crash test/i)).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
