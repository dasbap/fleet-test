import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpService, normalizeSearchText } from "@/services/help.service";

const article = (overrides: Record<string, unknown> = {}) => ({
  id: "a1",
  slug: "fleet-start",
  title: "Démarrer avec la flotte",
  category: "guide",
  role: [],
  locale: "fr",
  keywords: ["véhicule", "flotte"],
  content: "Ajouter un véhicule et gérer votre flotte efficacement.",
  route_context: ["/dashboard/fleet"],
  plan_min: null,
  module_keys: [],
  error_codes: [],
  sort_order: 1,
  is_published: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
}) as any;

describe("help service mutation coverage", () => {
  let repository: any;
  let service: HelpService;

  beforeEach(() => {
    repository = {
      findPublished: vi.fn(), findBySlug: vi.fn(), findByCategory: vi.fn(), findPublicFaq: vi.fn(), findFaqForAdmin: vi.fn(), upsertArticle: vi.fn(), deleteFaqArticle: vi.fn(), findByErrorCode: vi.fn(), recordView: vi.fn(), recordSearchEvent: vi.fn(), getAnalyticsSummary: vi.fn(),
    };
    service = new HelpService(repository);
  });

  it("normalizes search text", () => {
    expect(normalizeSearchText("École, VÉHICULE! #42")).toBe("ecole  vehicule   42");
    expect(normalizeSearchText("À bientôt")).toBe("a bientot");
  });

  it("builds fallback content for every locale", () => {
    for (const locale of ["fr", "en", "ln"] as const) {
      const rows = service.getFallbackArticles(locale);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.locale === locale && row.is_published === true)).toBe(true);
      expect(rows.every((row) => row.id === `fallback-${row.slug}-${locale}`)).toBe(true);
    }
  });

  it("uses repository articles then fallback on empty and errors", async () => {
    const db = [article()];
    repository.findPublished.mockResolvedValueOnce(db).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    await expect(service.getArticles("fr")).resolves.toBe(db);
    expect((await service.getArticles("fr"))[0].id).toMatch(/^fallback-/);
    expect((await service.getArticles("en"))[0].locale).toBe("en");
  });

  it("resolves article, category and public FAQ fallbacks", async () => {
    const fallback = service.getFallbackArticles("fr")[0];
    repository.findBySlug.mockResolvedValueOnce(article({ slug: "db" })).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(service.getArticleBySlug("db", "fr")).resolves.toEqual(expect.objectContaining({ slug: "db" }));
    await expect(service.getArticleBySlug(fallback.slug, "fr")).resolves.toEqual(expect.objectContaining({ slug: fallback.slug }));
    await expect(service.getArticleBySlug("missing-forever", "fr")).resolves.toBeNull();
    repository.findByCategory.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    expect((await service.getArticlesByCategory("guide" as any, "fr")).every((row) => row.category === "guide")).toBe(true);
    expect((await service.getArticlesByCategory("guide" as any, "fr")).every((row) => row.category === "guide")).toBe(true);
    repository.findPublicFaq.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    expect((await service.getPublicFaq("fr"))[0].id).toBe("fallback-public-faq-1");
    expect((await service.getPublicFaq("en"))[0].locale).toBe("en");
  });

  it("handles admin FAQ save and deletion", async () => {
    repository.findFaqForAdmin.mockResolvedValue([article({ category: "faq" })]);
    await expect(service.getFaqForAdmin("en")).resolves.toHaveLength(1);
    repository.upsertArticle.mockImplementation(async (value: any) => value);
    await expect(service.saveFaqArticle({ slug: "s", title: "Le bon titre de FAQ", content: "c", sort_order: 2, is_published: true })).resolves.toEqual(expect.objectContaining({ category: "faq", locale: "fr", keywords: ["bon", "titre", "FAQ"], route_context: ["/faq"] }));
    await expect(service.deleteFaqArticle("")).rejects.toThrow("FAQ introuvable.");
    await service.deleteFaqArticle("a1");
    expect(repository.deleteFaqArticle).toHaveBeenCalledWith("a1");
  });

  it("filters by role and enabled modules", () => {
    const rows = [article({ id: "public" }), article({ id: "driver", role: ["driver"] }), article({ id: "manager", role: ["manager"] }), article({ id: "module", module_keys: ["finance", "ai"] }), article({ id: "pro", plan_min: "pro" })];
    expect(service.filterForUser(rows, { role: "driver", planCode: "free", billingFlags: { finance: true, ai: false } } as any).map((row) => row.id)).toEqual(["public", "driver", "pro"]);
    expect(service.filterForUser(rows, { role: "manager", planCode: "enterprise", billingFlags: { finance: true, ai: true } } as any).map((row) => row.id)).toEqual(["public", "manager", "module", "pro"]);
  });

  it("returns contextual articles with a six-item cap", () => {
    const rows = Array.from({ length: 8 }, (_, i) => article({ id: `a${i}`, route_context: [i < 7 ? "/fleet" : "/other"] }));
    const ctx = { role: "driver", planCode: "pro", billingFlags: {} } as any;
    expect(service.getContextualArticles(rows, "/fleet/vehicles", ctx).map((row) => row.id)).toEqual(["a0", "a1", "a2", "a3", "a4", "a5"]);
    expect(service.resolveRouteSlug("/totally/unknown/path")).toBeNull();
  });

  it("searches exact fuzzy and multiword content without assuming irrelevant rows are excluded", () => {
    const rows = [article({ id: "prefix", title: "Véhicule panne", content: "atelier" }), article({ id: "contains", title: "Guide flotte", content: "réparer véhicule" }), article({ id: "fuzzy", title: "Entretien", content: "vehicule" }), article({ id: "none", title: "Facturation", content: "paiement" })];
    expect(service.searchArticles(rows, "   ")).toEqual([]);
    const exact = service.searchArticles(rows, "vehicule");
    expect(exact.slice(0, 3).map((row) => row.article.id)).toEqual(["prefix", "contains", "fuzzy"]);
    expect(exact[0].score).toBeGreaterThan(exact[1].score);
    expect(service.searchArticles(rows, "vehicul").length).toBeGreaterThan(0);
    expect(service.searchArticles(rows, "vehicule atelier")[0].article.id).toBe("prefix");
  });

  it("gets error help and tracks analytics", async () => {
    const db = article({ error_codes: ["E1"] });
    repository.findByErrorCode.mockResolvedValueOnce(db).mockResolvedValueOnce(null);
    await expect(service.getArticleForError("E1", "fr")).resolves.toBe(db);
    await service.trackView("fallback-x", "search" as any, "f");
    expect(repository.recordView).not.toHaveBeenCalled();
    await service.trackView("a1", "search" as any, null);
    expect(repository.recordView).toHaveBeenCalledWith("a1", { source: "search", fleet_id: null });
    await service.trackSearch("abc", 0, "f1");
    expect(repository.recordSearchEvent).toHaveBeenCalledWith({ query: "abc", results_count: 0, had_results: false, fleet_id: "f1" });
    repository.getAnalyticsSummary.mockResolvedValue({ views: 3 });
    await expect(service.getAnalytics()).resolves.toEqual({ views: 3 });
    expect(repository.getAnalyticsSummary).toHaveBeenCalledWith(30);
  });

  it("maps guide roles", () => {
    expect(HelpService.guideRoleToAppRole("chauffeur")).toBe("driver");
    expect(HelpService.guideRoleToAppRole("gestionnaire")).toBe("manager");
    expect(HelpService.guideRoleToAppRole("mécanicien")).toBe("mechanic");
    expect(HelpService.guideRoleToAppRole("organisateur")).toBe("organizer");
    expect(HelpService.guideRoleToAppRole("unknown")).toBeNull();
  });
});
