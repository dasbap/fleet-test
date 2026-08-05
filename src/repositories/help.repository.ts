import { supabase } from "@/integrations/supabase/client";
import type {
  HelpArticleRecord,
  HelpArticleInsert,
  HelpArticleViewInsert,
  HelpSearchEventInsert,
  HelpLocale,
  HelpArticleCategory,
} from "@/types/help";

interface HelpArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  role: string[] | null;
  locale: string;
  keywords: string[] | null;
  content: string;
  route_context: string[] | null;
  plan_min: string | null;
  module_keys: string[] | null;
  error_codes: string[] | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: HelpArticleRow): HelpArticleRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as HelpArticleCategory,
    role: (row.role ?? []) as HelpArticleRecord["role"],
    locale: row.locale as HelpLocale,
    keywords: row.keywords ?? [],
    content: row.content,
    route_context: row.route_context ?? [],
    plan_min: row.plan_min,
    module_keys: row.module_keys ?? [],
    error_codes: row.error_codes ?? [],
    sort_order: row.sort_order,
    is_published: row.is_published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class HelpRepository {
  async findPublicFaq(locale: HelpLocale = "fr"): Promise<HelpArticleRecord[]> {
    return this.findByCategory("faq", locale);
  }

  async findFaqForAdmin(
    locale: HelpLocale = "fr"
  ): Promise<HelpArticleRecord[]> {
    const { data, error } = await supabase
      .from("help_articles")
      .select("*")
      .eq("category", "faq")
      .eq("locale", locale)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erreur chargement FAQ admin:", error);
      throw new Error("Impossible de charger la FAQ.");
    }

    return (data ?? []).map((row) => mapRow(row as HelpArticleRow));
  }

  async upsertArticle(
    payload: HelpArticleInsert & { id?: string }
  ): Promise<HelpArticleRecord> {
    if (payload.category === "faq") {
      const { data, error } = await supabase.rpc("admin_upsert_faq_article", {
        p_id: payload.id ?? null,
        p_slug: payload.slug,
        p_title: payload.title,
        p_content: payload.content,
        p_locale: payload.locale ?? "fr",
        p_sort_order: payload.sort_order ?? 0,
        p_is_published: payload.is_published ?? true,
      });

      if (error) {
        console.error("Erreur sauvegarde article aide:", error);
        throw new Error("Impossible de sauvegarder l'article.");
      }

      return mapRow(data as HelpArticleRow);
    }

    const row = {
      id: payload.id,
      slug: payload.slug,
      title: payload.title,
      category: payload.category,
      role: payload.role ?? [],
      locale: payload.locale ?? "fr",
      keywords: payload.keywords ?? [],
      content: payload.content,
      route_context: payload.route_context ?? [],
      plan_min: payload.plan_min ?? null,
      module_keys: payload.module_keys ?? [],
      error_codes: payload.error_codes ?? [],
      sort_order: payload.sort_order ?? 0,
      is_published: payload.is_published ?? true,
    };

    const query = payload.id
      ? supabase
          .from("help_articles")
          .update(row)
          .eq("id", payload.id)
          .select("*")
          .single()
      : supabase.from("help_articles").insert(row).select("*").single();

    const { data, error } = await query;

    if (error) {
      console.error("Erreur sauvegarde article aide:", error);
      throw new Error("Impossible de sauvegarder l'article.");
    }

    return mapRow(data as HelpArticleRow);
  }

  async deleteFaqArticle(articleId: string): Promise<void> {
    const { error } = await supabase
      .from("help_articles")
      .delete()
      .eq("id", articleId)
      .eq("category", "faq");

    if (error) {
      console.error("Erreur suppression FAQ:", error);
      throw new Error("Impossible de supprimer la FAQ.");
    }
  }

  async findPublished(locale: HelpLocale = "fr"): Promise<HelpArticleRecord[]> {
    const { data, error } = await supabase
      .from("help_articles")
      .select("*")
      .eq("is_published", true)
      .eq("locale", locale)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erreur chargement articles aide:", error);
      throw new Error("Impossible de charger les articles d'aide.");
    }

    return (data ?? []).map((row) => mapRow(row as HelpArticleRow));
  }

  async findBySlug(
    slug: string,
    locale: HelpLocale = "fr"
  ): Promise<HelpArticleRecord | null> {
    const { data, error } = await supabase
      .from("help_articles")
      .select("*")
      .eq("slug", slug)
      .eq("locale", locale)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      console.error("Erreur article aide:", error);
      throw new Error("Impossible de charger l'article.");
    }

    return data ? mapRow(data as HelpArticleRow) : null;
  }

  async findByCategory(
    category: HelpArticleCategory,
    locale: HelpLocale = "fr"
  ): Promise<HelpArticleRecord[]> {
    const { data, error } = await supabase
      .from("help_articles")
      .select("*")
      .eq("category", category)
      .eq("locale", locale)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erreur catégorie aide:", error);
      throw new Error("Impossible de charger la catégorie.");
    }

    return (data ?? []).map((row) => mapRow(row as HelpArticleRow));
  }

  async findByErrorCode(
    errorCode: string,
    locale: HelpLocale = "fr"
  ): Promise<HelpArticleRecord | null> {
    const { data, error } = await supabase
      .from("help_articles")
      .select("*")
      .contains("error_codes", [errorCode])
      .eq("locale", locale)
      .eq("is_published", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche aide par code:", error);
      return null;
    }

    return data ? mapRow(data as HelpArticleRow) : null;
  }

  async recordView(
    articleId: string,
    payload: Omit<HelpArticleViewInsert, "article_id">
  ): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("help_article_views").insert({
      article_id: articleId,
      user_id: userData.user?.id ?? null,
      fleet_id: payload.fleet_id ?? null,
      source: payload.source,
    });

    if (error) {
      console.error("Erreur enregistrement vue aide:", error);
    }
  }

  async recordSearchEvent(payload: HelpSearchEventInsert): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("help_search_events").insert({
      query: payload.query,
      results_count: payload.results_count,
      had_results: payload.had_results,
      user_id: userData.user?.id ?? null,
      fleet_id: payload.fleet_id ?? null,
    });

    if (error) {
      console.error("Erreur enregistrement recherche aide:", error);
    }
  }

  async getAnalyticsSummary(days = 30): Promise<Record<string, unknown>> {
    const { data, error } = await supabase.rpc("get_help_analytics_summary", {
      p_days: days,
    });

    if (error) {
      console.error("Erreur analytics aide:", error);
      throw new Error("Impossible de charger les analytics.");
    }

    return (data as Record<string, unknown>) ?? {};
  }
}
