import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ChecklistCard } from "@/components/operations/ChecklistCard";
import { getDefaultDriverChecklists } from "@/features/operations/mocks/operationsMock";

describe("ChecklistCard", () => {
  it("affiche la progression 0/4 par défaut", () => {
    const { departureChecklist } = getDefaultDriverChecklists();
    render(
      <MemoryRouter>
        <ChecklistCard checklist={departureChecklist} />
      </MemoryRouter>,
    );
    expect(screen.getByText("0/4")).toBeInTheDocument();
    expect(screen.getByText("Feux, essuie-glaces et signalisation")).toBeInTheDocument();
  });

  it("appelle onToggleItem au clic et met à jour aria-pressed", () => {
    const { departureChecklist } = getDefaultDriverChecklists();
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <ChecklistCard checklist={departureChecklist} onToggleItem={onToggle} />
      </MemoryRouter>,
    );

    const firstItem = screen.getByRole("button", {
      name: /Feux, essuie-glaces et signalisation/i,
    });
    expect(firstItem).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(firstItem);
    expect(onToggle).toHaveBeenCalledWith("d1");
  });

  it("affiche 1/4 quand un item est coché", () => {
    const { departureChecklist } = getDefaultDriverChecklists();
    const checklist = {
      ...departureChecklist,
      items: departureChecklist.items.map((item, index) =>
        index === 0 ? { ...item, done: true } : item,
      ),
    };
    render(
      <MemoryRouter>
        <ChecklistCard checklist={checklist} />
      </MemoryRouter>,
    );
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  it("masque le titre visible si showTitle=false", () => {
    const { departureChecklist } = getDefaultDriverChecklists();
    render(
      <MemoryRouter>
        <ChecklistCard checklist={departureChecklist} showTitle={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.getByText("Checklist départ", { selector: ".sr-only" })).toBeInTheDocument();
  });
});
