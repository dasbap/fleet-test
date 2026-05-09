import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PageErrorState } from "./PageErrorState";

describe("PageErrorState", () => {
  it("affiche le message et le bouton Réessayer", () => {
    const onRetry = vi.fn();
    render(
      <PageErrorState message="Problème réseau." onRetry={onRetry} title="Erreur" />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Problème réseau.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("n’affiche pas de bouton sans onRetry", () => {
    render(<PageErrorState message="Sans action." />);
    expect(screen.queryByRole("button", { name: "Réessayer" })).not.toBeInTheDocument();
  });
});
