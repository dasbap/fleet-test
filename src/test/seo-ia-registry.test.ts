import { describe, expect, it } from "vitest";
import {
  getSeoIaArticleBySlug,
  getSeoIaArticlePaths,
  SEO_IA_PILLAR_SLUGS,
} from "@/content/seo-ia/registry";
import { buildResourceRouteMeta, getSeoIaCanonicalPath } from "@/lib/seo-resources";

describe("seo-ia registry", () => {
  it("expose 3 piliers et 18 articles", () => {
    expect(SEO_IA_PILLAR_SLUGS).toHaveLength(3);
    expect(getSeoIaArticlePaths().length).toBeGreaterThanOrEqual(18);
  });

  it("résout un article cluster et un modèle imbriqué", () => {
    expect(getSeoIaArticleBySlug("brief-seo-automatise-redaction-ia")?.kind).toBe("cluster");
    expect(getSeoIaArticleBySlug("modeles/brief-agence")?.kind).toBe("modele");
  });

  it("génère les métas pour le pré-rendu", () => {
    const path = getSeoIaCanonicalPath("optimisation-contenu-ia-seo");
    const meta = buildResourceRouteMeta()[path];
    expect(meta?.title).toContain("Optimisation");
    expect(path).toBe("/ressources/seo-ia/optimisation-contenu-ia-seo");
  });
});
