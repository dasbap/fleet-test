import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUniversalSearch } from "@/hooks/useUniversalSearch";
import type { UniversalSearchResult } from "@/services/universalSearch.service";

const { searchAllMock } = vi.hoisted(() => ({
  searchAllMock: vi.fn(),
}));

vi.mock("@/services/universalSearch.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/universalSearch.service")>();
  return {
    ...actual,
    searchAll: searchAllMock,
    searchStaticIndex: vi.fn(() => []),
  };
});

function makeResult(
  overrides: Partial<UniversalSearchResult>,
): UniversalSearchResult {
  return {
    id: "id-1",
    kind: "vehicle",
    title: "AB-123-CD — Toyota Hilux",
    subtitle: "12 000 km · Jean · active",
    badge: "active",
    badgeColor: "green",
    href: "/flotte/veh-1",
    ...overrides,
  };
}

describe("useUniversalSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("applique le debounce avant de lancer la recherche", async () => {
    searchAllMock.mockResolvedValueOnce([makeResult({ id: "veh-1" })]);
    const { result } = renderHook(() => useUniversalSearch("fleet-1"));

    act(() => {
      result.current.setQuery("AB-123");
    });

    expect(searchAllMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(219);
    });
    expect(searchAllMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(searchAllMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
    expect(result.current.totalCount).toBe(1);
  });

  it("ignore les résultats d'une requête obsolète", async () => {
    let resolveFirst: ((value: UniversalSearchResult[]) => void) | undefined;
    searchAllMock
      .mockImplementationOnce(
        () =>
          new Promise<UniversalSearchResult[]>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce([makeResult({ id: "veh-new", title: "NEW-001" })]);

    const { result } = renderHook(() => useUniversalSearch("fleet-1"));

    await act(async () => {
      result.current.setQuery("OLD");
      await vi.advanceTimersByTimeAsync(220);
    });

    await act(async () => {
      result.current.setQuery("NEW");
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(result.current.flatResults[0]?.id).toBe("veh-new");

    await act(async () => {
      resolveFirst?.([makeResult({ id: "veh-old", title: "OLD-001" })]);
    });

    expect(result.current.flatResults[0]?.id).toBe("veh-new");
  });

  it("réinitialise proprement l'état", async () => {
    searchAllMock.mockResolvedValueOnce([makeResult({ id: "veh-2" })]);
    const { result } = renderHook(() => useUniversalSearch("fleet-1"));

    await act(async () => {
      result.current.setQuery("AB");
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(result.current.status).toBe("success");
    expect(result.current.totalCount).toBe(1);

    // async act : avec fake timers actifs, un act() synchrone ne vide pas
    // les microtasks React 18 — les 4 setState de reset() ont besoin d'un flush async.
    await act(async () => {
      result.current.reset();
    });

    expect(result.current.query).toBe("");
    expect(result.current.groups).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.status).toBe("idle");
    expect(result.current.selectedIndex).toBe(-1);
  });

  it("regroupe les résultats et expose flatResults + sélection", async () => {
    searchAllMock.mockResolvedValueOnce([
      makeResult({ id: "veh-1", kind: "vehicle", title: "MIX-123" }),
      makeResult({
        id: "mnt-1",
        kind: "maintenance",
        title: "Entretien mix",
        badge: "en cours",
        badgeColor: "yellow",
      }),
      makeResult({
        id: "al-1",
        kind: "alert",
        title: "Alerte mix",
        badge: "critical",
        badgeColor: "red",
      }),
    ]);
    const { result } = renderHook(() => useUniversalSearch("fleet-1"));

    await act(async () => {
      result.current.setQuery("mix");
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(result.current.groups.map((g) => g.type)).toEqual([
      "vehicle",
      "maintenance",
      "alert",
    ]);
    expect(result.current.flatResults).toHaveLength(3);

    // async act : setSelectedIndex est sync mais avec fake timers React 18
    // a besoin d'un flush async pour vider sa file de microtasks.
    await act(async () => {
      result.current.setSelectedIndex(1);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it("utilise le cache en mémoire pour la même requête", async () => {
    searchAllMock.mockResolvedValue([makeResult({ id: "veh-cache" })]);
    const { result } = renderHook(() => useUniversalSearch("fleet-1"));

    await act(async () => {
      result.current.setQuery("cache");
      await vi.advanceTimersByTimeAsync(220);
    });
    expect(result.current.status).toBe("success");
    expect(searchAllMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.setQuery("");
      await vi.advanceTimersByTimeAsync(220);
      result.current.setQuery("cache");
      await vi.advanceTimersByTimeAsync(220);
    });

    expect(searchAllMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
    expect(result.current.flatResults[0]?.id).toBe("veh-cache");
  });
});
