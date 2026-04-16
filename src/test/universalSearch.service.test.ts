import { describe, expect, it, vi } from "vitest";
import {
  searchAll,
  type UniversalSearchDeps,
  type UniversalSearchResult,
} from "@/services/universalSearch.service";

function createDeps(
  overrides: Partial<UniversalSearchDeps> = {},
): UniversalSearchDeps {
  return {
    getUnifiedRows: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const vehicleSample: UniversalSearchResult = {
  id: "veh-1",
  kind: "vehicle",
  title: "AB-123-CD — Toyota Hilux",
  subtitle: "12 500 km · Jean Dupont · active",
  badge: "active",
  badgeColor: "green",
  href: "/dashboard/vehicles/veh-1",
};

describe("searchAll", () => {
  it("retourne un tableau vide si la requête est vide ou uniquement des espaces", async () => {
    const deps = createDeps();
    await expect(searchAll("   ", { kind: "all" }, "fleet-1", deps)).resolves.toEqual([]);
    await expect(searchAll("", { kind: "all" }, "fleet-1", deps)).resolves.toEqual([]);
    expect(deps.getUnifiedRows).not.toHaveBeenCalled();
  });

  it("retourne un tableau vide si fleetId est absent", async () => {
    const deps = createDeps();
    await expect(
      searchAll("test", { kind: "all" }, null, deps),
    ).resolves.toEqual([]);
    expect(deps.getUnifiedRows).not.toHaveBeenCalled();
  });

  it("normalise la requête en minuscules pour les dépendances", async () => {
    const deps = createDeps();
    await searchAll("  HELLO  ", { kind: "vehicle" }, "fleet-x", deps);
    expect(deps.getUnifiedRows).toHaveBeenCalledWith("fleet-x", "hello");
  });

  it("filtre correctement les véhicules si kind = vehicle", async () => {
    const deps = createDeps({
      getUnifiedRows: vi.fn().mockResolvedValue([
        vehicleSample,
        {
          id: "job-99",
          kind: "maintenance",
          title: "Entretien",
          subtitle: "Planifié",
          href: "/dashboard/maintenance?job=job-99",
        },
      ]),
    });
    const results = await searchAll("x", { kind: "vehicle" }, "fleet-1", deps);
    expect(deps.getUnifiedRows).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("vehicle");
    expect(results[0].href).toBe("/dashboard/vehicles/veh-1");
    expect(results[0].badgeColor).toBe("green");
  });

  it("filtre correctement la maintenance si kind = maintenance", async () => {
    const deps = createDeps({
      getUnifiedRows: vi.fn().mockResolvedValue([
        {
          id: "job-99",
          kind: "maintenance",
          title: "Entretien (queued) — XY-999-ZZ",
          subtitle: "Planifié : 15/01/2026 · Vidange",
          badge: "en cours",
          badgeColor: "yellow",
          href: "/dashboard/maintenance?job=job-99",
        },
      ]),
    });
    const results = await searchAll("vidange", { kind: "maintenance" }, "fleet-1", deps);
    expect(deps.getUnifiedRows).toHaveBeenCalled();
    expect(results[0].kind).toBe("maintenance");
    expect(results[0].href).toBe("/dashboard/maintenance?job=job-99");
    expect(results[0].badge).toBe("en cours");
  });

  it("filtre correctement les alertes si kind = alert", async () => {
    const deps = createDeps({
      getUnifiedRows: vi.fn().mockResolvedValue([
        {
          id: "al-1",
          kind: "alert",
          title: "Frein",
          subtitle: "ZZ-001-AA · Sévérité : critical",
          badge: "critical",
          badgeColor: "red",
          href: "/dashboard/alerts/al-1",
        },
      ]),
    });
    const results = await searchAll("frein", { kind: "alert" }, "fleet-1", deps);
    expect(deps.getUnifiedRows).toHaveBeenCalled();
    expect(results[0].kind).toBe("alert");
    expect(results[0].href).toBe("/dashboard/alerts/al-1");
    expect(results[0].badgeColor).toBe("red");
  });

  it("avec kind = all, renvoie tous les résultats", async () => {
    const deps = createDeps({
      getUnifiedRows: vi.fn().mockResolvedValue([
        vehicleSample,
        {
          id: "j1",
          kind: "maintenance",
          title: "Entretien",
          subtitle: "ok",
          badge: "terminé",
          href: "/dashboard/maintenance?job=j1",
        },
        {
          id: "a1",
          kind: "alert",
          title: "Info",
          subtitle: "Sévérité : low",
          badgeColor: "green",
          href: "/dashboard/alerts/a1",
        },
      ]),
    });
    const results = await searchAll("mix", { kind: "all" }, "fleet-1", deps);
    expect(deps.getUnifiedRows).toHaveBeenCalled();
    expect(results.map((r) => r.kind)).toEqual(["vehicle", "maintenance", "alert"]);
    expect(results[1].badge).toBe("terminé");
    expect(results[2].badgeColor).toBe("green");
  });
});
