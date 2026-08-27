import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpService, normalizeSearchText } from "@/services/help.service";

function article(overrides: Record<string, unknown> = {}) {
  return {
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
  } as any;
}

describe("help service mutation coverage", () => {
  let repository: any;
  let service: HelpService;

  beforeEach(() => {
    repository = {
      findPublished: vi.fn(),
      findBySlug: vi.fn(),
      findByCategory: vi.fn(),
      findPublicFaq: vi.fn(),
      findFaqForAdmin: vi.fn(),
      upsertArticle: vi.fn(),
      deleteFaqArticle: vi.fn(),
      findByErrorCode: vi.fn(),
      recordView: vi.fn(),
      recordSearchEvent: vi.fn(),
      getAnalyticsSummary: vi.fn(),
    };
    service = new HelpService(repository);
  });

  it("normalizes accents punctuation and casing", () => {
    expect(normalizeSearchText("École, VÉHICULE! #42")).toBe("ecole  vehicule   42");
    expect(normalizeSearchText("À bientôt")).toBe("a bientot");
  });

  it("builds fallback articles for all locales with required defaults", () => {
    for (const locale of ["fr", "en", "ln"] as const) {
      const rows = service.getFallbackArticles(locale);
      expect(rows.length).toBeGreaterThan(0);
      for (const [index, row] of rows.entries()) {
        expect(row.id).toContain(`fallback-${row.slug}-${locale}`);
        expect(row.locale).toBe(locale);
        expect(row.role).toEqual(expect.any(Array));
        expect(row.keywords).toEqual(expect.any(Array));
        expect(row.route_context).toEqual(expect.any(Array));
        expect(row.module_keys).toEqual(expect.any(Array));
        expect(row.error_codes).toEqual(expect.any(Array));
        expect(row.sort_order).toEqual(expect.any(Number));
        expect(row.is_published).toBe(true);
        expect(Number.isNaN(Date.parse(row.created_at))).toBe(false);
        expect(Number.isNaN(Date.parse(row.updated_at))).toBe(false);
        expect(index).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("prefers repository articles and falls back on empty or errors", async () => {
    const db = [article()];
    repository.findPublished.mockResolvedValueOnce(db).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    await expect(service.getArticles("fr")).resolves.toBe(db);
    const emptyFallback = await service.getArticles("fr");
    expect(emptyFallback.length).toBeGreaterThan(0);
    expect(emptyFallback[0].id).toMatch(/^fallback-/);
    const errorFallback = await service.getArticles("en");
    expect(errorFallback.length).toBeGreaterThan(0);
    expect(errorFallback[0].locale).toBe("en");
  });

  it("gets articles by slug from db or fallback and returns null", async () => {
    const db = article({ slug: "db" });
    repository.findBySlug.mockResolvedValueOnce(db).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("down"));
    await expect(service.getArticleBySlug("db", "fr")).resolves.toBe(db);
    const fallbackSlug = service.getFallbackArticles("fr")[0].slug;
    await expect(service.getArticleBySlug(fallbackSlug, "fr")).resolves.toEqual(expect.objectContaining({ slug: fallbackSlug }));
    await expect(service.getArticleBySlug("definitely-missing", "fr")).resolves.toBeNull();
    await expect(service.getArticleBySlug(fallbackSlug, "fr")).resolves.toEqual(expect.objectContaining({ slug: fallbackSlug }));
  });

  it("gets category articles from db and fallback", async () => {
    const db = [article({ category: "faq" })];
    repository.findByCategory.mockResolvedValueOnce(db).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    await expect(service.getArticlesByCategory("faq" as any, "fr")).resolves.toBe(db);
    const fallback = await service.getArticlesByCategory("guide" as any, "fr");
    expect(fallback.every((x) => x.category === "guide")).toBe(true);
    const errorFallback = await service.getArticlesByCategory("guide" as any, "fr");
    expect(errorFallback.every((x) => x.category === "guide")).toBe(true);
  });

  it("builds public FAQ and uses fallback when needed", async () => {
    const fallback = service.getFallbackFaq("ln");
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback[0]).toEqual(expect.objectContaining({ id: "fallback-public-faq-1", slug: "public-faq-1", category: "faq", locale: "ln", route_context: ["/faq"], sort_order: 1, is_published: true }));
    repository.findPublicFaq.mockResolvedValueOnce([article({ category: "faq" })]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down"));
    await expect(service.getPublicFaq("fr")).resolves.toHaveLength(1);
    expect((await service.getPublicFaq("fr"))[0].id).toBe("fallback-public-faq-1");
    expect((await service.getPublicFaq("en"))[0].locale).toBe("en");
  });

  it("delegates admin FAQ and saves normalized FAQ payload", async () => {
    repository.findFaqForAdmin.mockResolvedValue([article({ category: "faq" })]);
    await expect(service.getFaqForAdmin("en")).resolves.toHaveLength(1);
    expect(repository.findFaqForAdmin).toHaveBeenCalledWith("en");
    repository.upsertArticle.mockImplementation(async (x: any) => x);
    const saved = await service.saveFaqArticle({ slug: "s", title: "Le bon titre de FAQ", content: "c", sort_order: 2, is_published: true });
    expect(saved).toEqual(expect.objectContaining({ slug: "s", category: "faq", locale: "fr", route_context: ["/faq"], keywords: ["bon", "titre", "FAQ"] }));
    await service.saveFaqArticle({ slug: "s2", title: "One two three", content: "c", sort_order: 1, is_published: false, locale: "en" });
    expect(repository.upsertArticle).toHaveBeenLastCalledWith(expect.objectContaining({ locale: "en", keywords: ["One", "two", "three"] }));
  });

  it("validates FAQ deletion", async () => {
    await expect(service.deleteFaqArticle("")).rejects.toThrow("FAQ introuvable.");
    repository.deleteFaqArticle.mockResolvedValue(undefined);
    await service.deleteFaqArticle("a1");
    expect(repository.deleteFaqArticle).toHaveBeenCalledWith("a1");
  });

  it("filters by role and enabled modules while retaining higher-plan articles", () => {
    const rows = [
      article({ id: "public" }),
      article({ id: "driver", role: ["driver"] }),
      article({ id: "manager", role: ["manager"] }),
      article({ id: "module", module_keys: ["finance", "ai"] }),
      article({ id: "pro", plan_min: "pro" }),
    ];
    const filtered = service.filterForUser(rows, { role: "driver", planCode: "free", billingFlags: { finance: true, ai: false } } as any);
    expect(filtered.map((x) => x.id)).toEqual(["public", "driver", "pro"]);
    const enabled = service.filterForUser(rows, { role: "manager", planCode: "enterprise", billingFlags: { finance: true, ai: true } } as any);
    expect(enabled.map((x) => x.id)).toEqual(["public", "manager", "module", "pro"]);
  });

  it("returns contextual route matches up to six then general fallback", () => {
    const rows = Array.from({ length: 8 }, (_, i) => article({ id: `a${i}`, route_context: [i < 7 ? "/fleet" : "/other"] }));
    const ctx = { role: "driver", planCode: "pro", billingFlags: {} } as any;
    expect(service.getContextualArticles(rows, "/fleet/vehicles", ctx).map((x) => x.id)).toEqual(["a0", "a1", "a2", "a3", "a4", "a5"]);
    expect(service.getContextualArticles(rows, "/none", ctx).map((x) => x.id)).toEqual(["a0", "a1", "a2", "a3", "a4", "a5"]);
  });

  it("resolves known route slugs and unknown routes", () => {
    expect(service.resolveRouteSlug("/dashboard/fleet")).toEqual(expect.any(String));
    expect(service.resolveRouteSlug("/totally/unknown/path")).toBeNull();
  });

  it("searches exact prefix contains fuzzy multiword and sorts by score", () => {
    const rows = [
      article({ id: "prefix", title: "Véhicule panne", content: "atelier" }),
      article({ id: "contains", title: "Guide flotte", content: "réparer véhicule" }),
      article({ id: "fuzzy", title: "Entretien", content: "vehicule" }),
      article({ id: "none", title: "Facturation", content: "paiement" }),
    ];
    expect(service.searchArticles(rows, "   ")).toEqual([]);
    const exact = service.searchArticles(rows, "vehicule");
    expect(exact.map((x) => x.article.id)).toEqual(["prefix", "contains", "fuzzy"]);
    expect(exact[0].score).toBeGreaterThan(exact[1].score);
    const fuzzy = service.searchArticles(rows, "vehicul");
    expect(fuzzy.length).toBeGreaterThan(0);
    const multi = service.searchArticles(rows, "vehicule atelier");
    expect(multi[0].article.id).toBe("prefix");
  });

  it("applies user filtering during search", () => {
    const rows = [article({ id: "driver", role: ["driver"] }), article({ id: "manager", role: ["manager"] })];
    const results = service.searchArticles(rows, "flotte", { role: "driver", planCode: "free", billingFlags: {} } as any);
    expect(results.map((x) => x.article.id)).toEqual(["driver"]);
  });

  it("gets error articles from db or fallback", async () => {
    const db = article({ error_codes: ["E1"] });
    repository.findByErrorCode.mockResolvedValueOnce(db).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("down"));
    await expect(service.getArticleForError("E1", "fr")).resolves.toBe(db);
    const fallbackWithError = service.getFallbackArticles("fr").find((x) => x.error_codes.length > 0);
    if (fallbackWithError) {
      await expect(service.getArticleForError(fallbackWithError.error_codes[0], "fr")).resolves.toEqual(expect.objectContaining({ slug: fallbackWithError.slug }));
      await expect(service.getArticleForError(fallbackWithError.error_codes[0], "fr")).resolves.toEqual(expect.objectContaining({ slug: fallbackWithError.slug }));
    } else {
      await expect(service.getArticleForError("missing", "fr")).resolves.toBeNull();
      await expect(service.getArticleForError("missing", "fr")).resolves.toBeNull();
    }
  });

  it("tracks views searches analytics and skips fallback views", async () => {
    await service.trackView("fallback-x", "search" as any, "f");
    expect(repository.recordView).not.toHaveBeenCalled();
    await service.trackView("a1", "search" as any, null);
    expect(repository.recordView).toHaveBeenCalledWith("a1", { source: "search", fleet_id: null });
    await service.trackSearch("abc", 0, "f1");
    expect(repository.recordSearchEvent).toHaveBeenLastCalledWith({ query: "abc", results_count: 0, had_results: false, fleet_id: "f1" });
    await service.trackSearch("abc", 2, undefined);
    expect(repository.recordSearchEvent).toHaveBeenLastCalledWith({ query: "abc", results_count: 2, had_results: true, fleet_id: undefined });
    repository.getAnalyticsSummary.mockResolvedValue({ views: 3 });
    await expect(service.getAnalytics()).resolves.toEqual({ views: 3 });
    expect(repository.getAnalyticsSummary).toHaveBeenCalledWith(30);
    await service.getAnalytics(7);
    expect(repository.getAnalyticsSummary).toHaveBeenLastCalledWith(7);
  });

  it("maps guide roles exactly", () => {
    expect(HelpService.guideRoleToAppRole("chauffeur")).toBe("driver");
    expect(HelpService.guideRoleToAppRole("gestionnaire")).toBe("manager");
    expect(HelpService.guideRoleToAppRole("mécanicien")).toBe("mechanic");
    expect(HelpService.guideRoleToAppRole("organisateur")).toBe("organizer");
    expect(HelpService.guideRoleToAppRole("unknown")).toBeNull();
  });
});
