import { describe, expect, it, vi } from "vitest";
import {
  ALL_HELP_ARTICLES,
  routeToCategory,
  searchArticles,
  type HelpArticle,
} from "@/hooks/useHelp";

describe("routeToCategory", () => {
  it("retourne dashboard pour / et /dashboard*", () => {
    expect(routeToCategory("/")).toBe("dashboard");
    expect(routeToCategory("/dashboard")).toBe("dashboard");
    expect(routeToCategory("/dashboard/stats")).toBe("dashboard");
  });

  it("retourne les catégories attendues pour les principales routes", () => {
    expect(routeToCategory("/flotte")).toBe("fleet");
    expect(routeToCategory("/flotte/list")).toBe("fleet");
    expect(routeToCategory("/creneaux")).toBe("creneau");
    expect(routeToCategory("/entretiens")).toBe("maintenance");
    expect(routeToCategory("/alertes")).toBe("alerts");
    expect(routeToCategory("/rapports")).toBe("reports");
    expect(routeToCategory("/equipe")).toBe("account");
    expect(routeToCategory("/parametres")).toBe("account");
  });

  it("priorise les sous-routes /dashboard vers la bonne catégorie", () => {
    expect(routeToCategory("/dashboard/vehicles")).toBe("fleet");
    expect(routeToCategory("/dashboard/closure")).toBe("creneau");
    expect(routeToCategory("/dashboard/maintenance")).toBe("maintenance");
    expect(routeToCategory("/dashboard/alerts")).toBe("alerts");
    expect(routeToCategory("/dashboard/reports")).toBe("reports");
    expect(routeToCategory("/dashboard/settings")).toBe("account");
  });

  it("retourne null pour une route inconnue", () => {
    expect(routeToCategory("/unknown")).toBeNull();
  });
});

describe("searchArticles", () => {
  const makeArticles = (): HelpArticle[] => ALL_HELP_ARTICLES.slice(0, 3);

  const tMock = vi
    .fn<(key: string, ns: string) => string>()
    .mockImplementation((key) => {
      if (key === "dashboard_q1") return "Comment lire les KPI du tableau de bord ?";
      if (key === "dashboard_a1") return "Les KPI sont mis à jour en temps réel.";
      if (key === "dashboard_q2") return "Pourquoi mon dashboard est vide ?";
      if (key === "dashboard_a2") return "Ajoutez d'abord des véhicules.";
      if (key === "dashboard_q3") return "Comment résoudre une alerte en 1 clic ?";
      if (key === "dashboard_a3") return "Utilisez le bouton d'action rapide.";
      return key;
    });

  it("retourne un tableau vide pour une requête vide", () => {
    const result = searchArticles(makeArticles(), "", tMock);
    expect(result).toEqual([]);
  });

  it("matche sur les tags", () => {
    const result = searchArticles(makeArticles(), "kpi", tMock);
    expect(result.some((a) => a.id === "dash-1")).toBe(true);
  });

  it("matche sur la question traduite", () => {
    const result = searchArticles(makeArticles(), "tableau de bord", tMock);
    expect(result.some((a) => a.id === "dash-1")).toBe(true);
  });

  it("matche sur la réponse traduite", () => {
    const result = searchArticles(makeArticles(), "temps réel", tMock);
    expect(result.some((a) => a.id === "dash-1")).toBe(true);
  });

  it("ignore les accents pour la recherche", () => {
    const result = searchArticles(makeArticles(), "tableau de bord", tMock);
    expect(result.some((a) => a.id === "dash-1")).toBe(true);

    const resultSansAccents = searchArticles(
      makeArticles(),
      "tableau de bord",
      tMock,
    );
    expect(resultSansAccents.some((a) => a.id === "dash-1")).toBe(true);
  });
});

