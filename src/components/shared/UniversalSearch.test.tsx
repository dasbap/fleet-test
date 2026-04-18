import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { UniversalSearch } from "@/components/shared/UniversalSearch";

const useUniversalSearchMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string; query?: string }) =>
      options?.defaultValue ?? _key,
  }),
}));

vi.mock("@/hooks/useUniversalSearch", () => ({
  useUniversalSearch: (...args: unknown[]) => useUniversalSearchMock(...args),
}));

function renderComponent(props?: { fleetId?: string | null; onNavigate?: (href: string) => void }) {
  return render(
    <MemoryRouter>
      <UniversalSearch fleetId={props?.fleetId === undefined ? "fleet-1" : props.fleetId} onNavigate={props?.onNavigate} />
    </MemoryRouter>,
  );
}

describe("UniversalSearch", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      value: vi.fn(),
      configurable: true,
    });
  });

  it("n'affiche rien quand la flotte active est absente", () => {
    useUniversalSearchMock.mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      groups: [],
      totalCount: 0,
      status: "idle",
      selectedIndex: -1,
      setSelectedIndex: vi.fn(),
      flatResults: [],
      reset: vi.fn(),
    });

    const { container } = renderComponent({ fleetId: null });
    expect(container.firstChild).toBeNull();
  });

  it("ouvre la palette avec Ctrl+K et expose les rôles ARIA attendus", () => {
    useUniversalSearchMock.mockReturnValue({
      query: "",
      setQuery: vi.fn(),
      groups: [],
      totalCount: 0,
      status: "idle",
      selectedIndex: -1,
      setSelectedIndex: vi.fn(),
      flatResults: [],
      reset: vi.fn(),
    });

    renderComponent();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("navigue avec Enter sur le résultat sélectionné", () => {
    const reset = vi.fn();
    const onNavigate = vi.fn();
    const setSelectedIndex = vi.fn();

    useUniversalSearchMock.mockReturnValue({
      query: "AB",
      setQuery: vi.fn(),
      groups: [
        {
          type: "vehicle",
          label: "Véhicules",
          results: [
            {
              id: "veh-1",
              type: "vehicle",
              title: "AB-123",
              subtitle: "Toyota",
              href: "/dashboard/fleet/veh-1",
              score: 10,
            },
          ],
        },
      ],
      totalCount: 1,
      status: "success",
      selectedIndex: 0,
      setSelectedIndex,
      flatResults: [
        {
          id: "veh-1",
          type: "vehicle",
          title: "AB-123",
          subtitle: "Toyota",
          href: "/dashboard/fleet/veh-1",
          score: 10,
        },
      ],
      reset,
    });

    renderComponent({ onNavigate });
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir la recherche" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onNavigate).toHaveBeenCalledWith("/dashboard/fleet/veh-1");
    expect(reset).toHaveBeenCalled();
  });
});
