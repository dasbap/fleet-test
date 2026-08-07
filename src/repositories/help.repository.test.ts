import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { HelpRepository } from "@/repositories/help.repository";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe("HelpRepository", () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockReset();
  });

  it("sauvegarde les FAQ admin via RPC pour eviter le PATCH RLS direct", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        id: "faq-1",
        slug: "question",
        title: "Question",
        category: "faq",
        role: [],
        locale: "fr",
        keywords: [],
        content: "Reponse",
        route_context: ["/faq"],
        plan_min: null,
        module_keys: [],
        error_codes: [],
        sort_order: 1,
        is_published: true,
        created_at: "2026-08-03T10:00:00.000Z",
        updated_at: "2026-08-03T10:00:00.000Z",
      },
      error: null,
    } as never);

    await new HelpRepository().upsertArticle({
      id: "faq-1",
      slug: "question",
      title: "Question",
      category: "faq",
      locale: "fr",
      content: "Reponse",
      sort_order: 1,
      is_published: true,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("admin_upsert_faq_article", {
      p_id: "faq-1",
      p_slug: "question",
      p_title: "Question",
      p_content: "Reponse",
      p_locale: "fr",
      p_sort_order: 1,
      p_is_published: true,
    });
  });
});
