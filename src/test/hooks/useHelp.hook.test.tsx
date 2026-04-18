import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHelp } from "@/hooks/useHelp";

let mockPathname = "/";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

type PosthogCaptureFn = (event: string, props?: Record<string, unknown>) => void;

describe("useHelp hook", () => {
  beforeEach(() => {
    mockPathname = "/";
    (window as Window & { posthog?: { capture: PosthogCaptureFn } }).posthog = {
      capture: vi.fn(),
    };
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(
      () => {},
    );
  });

  it("initialise l'état correct pour le dashboard", () => {
    const { result } = renderHook(() => useHelp());

    expect(result.current.currentPage).toBe("dashboard");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.searchQuery).toBe("");
    expect(result.current.expandedId).toBeNull();
    expect(result.current.contextualArticles.every((a) => a.category === "dashboard")).toBe(
      true,
    );
  });

  it("réinitialise l'état lors d'un changement de route", () => {
    const { result, rerender } = renderHook(() => useHelp());

    act(() => {
      result.current.openHelp();
    });
    expect(result.current.isOpen).toBe(true);

    mockPathname = "/flotte";
    rerender();

    expect(result.current.isOpen).toBe(false);
    expect(result.current.searchQuery).toBe("");
    expect(result.current.expandedId).toBeNull();
    expect(result.current.currentPage).toBe("fleet");
  });

  it("ouvre et ferme l'aide avec tracking et localStorage", () => {
    const { result } = renderHook(() => useHelp());

    const captureSpy = (
      (window as Window & {
        posthog?: { capture: PosthogCaptureFn };
      }).posthog as { capture: PosthogCaptureFn }
    ).capture as ReturnType<typeof vi.fn>;
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");

    act(() => {
      result.current.openHelp();
    });

    expect(result.current.isOpen).toBe(true);
    expect(setItemSpy).toHaveBeenCalled();
    expect(captureSpy).toHaveBeenCalledWith(
      "help_opened",
      expect.objectContaining({ page: "dashboard" }),
    );

    act(() => {
      result.current.closeHelp();
    });

    expect(result.current.isOpen).toBe(false);
    expect(captureSpy).toHaveBeenCalledWith(
      "help_closed",
      expect.objectContaining({ page: "dashboard" }),
    );
  });

  it("gère la recherche locale et le tracking associé", () => {
    const { result } = renderHook(() => useHelp());

    const captureSpy = (
      (window as Window & {
        posthog?: { capture: PosthogCaptureFn };
      }).posthog as { capture: PosthogCaptureFn }
    ).capture as ReturnType<typeof vi.fn>;

    act(() => {
      result.current.setSearchQuery("a");
    });
    expect(result.current.searchResults).toEqual([]);

    act(() => {
      result.current.setSearchQuery("alertes");
    });

    expect(result.current.searchQuery).toBe("alertes");
    expect(captureSpy).toHaveBeenCalledWith(
      "help_searched",
      expect.objectContaining({ query: "alertes" }),
    );
  });

  it("bascule l'expansion d'un article et trace l'évènement", () => {
    const { result } = renderHook(() => useHelp());

    const captureSpy = (
      (window as Window & {
        posthog?: { capture: PosthogCaptureFn };
      }).posthog as { capture: PosthogCaptureFn }
    ).capture as ReturnType<typeof vi.fn>;

    act(() => {
      result.current.toggleArticle("dash-1");
    });

    expect(result.current.expandedId).toBe("dash-1");
    expect(captureSpy).toHaveBeenCalledWith(
      "help_article_expanded",
      expect.objectContaining({
        article_id: "dash-1",
        page: "dashboard",
      }),
    );

    act(() => {
      result.current.toggleArticle("dash-1");
    });

    expect(result.current.expandedId).toBeNull();
  });
});

