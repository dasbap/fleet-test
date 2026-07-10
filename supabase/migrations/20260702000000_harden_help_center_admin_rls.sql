-- Move help center hardening out of the historical 20260529100000 migration.
-- This migration is idempotent and tolerates environments where admin_profiles
-- has not been created yet.

CREATE OR REPLACE FUNCTION public.set_help_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_help_center_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF to_regclass('public.admin_profiles') IS NULL THEN
    RETURN false;
  END IF;

  EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id = auth.uid())'
    INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_help_center_admin() TO authenticated;

DROP POLICY IF EXISTS help_article_views_read_own ON public.help_article_views;
CREATE POLICY help_article_views_read_own ON public.help_article_views
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_help_center_admin()
  );

DROP POLICY IF EXISTS help_search_events_read_admin ON public.help_search_events;
CREATE POLICY help_search_events_read_admin ON public.help_search_events
  FOR SELECT USING (
    public.is_help_center_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
    )
  );

CREATE OR REPLACE FUNCTION public.get_help_analytics_summary(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
  ) AND NOT public.is_help_center_admin() THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  SELECT jsonb_build_object(
    'top_articles', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT ha.slug, ha.title, ha.category, COUNT(v.id)::int AS views
        FROM public.help_article_views v
        JOIN public.help_articles ha ON ha.id = v.article_id
        WHERE v.created_at >= now() - (p_days || ' days')::interval
        GROUP BY ha.slug, ha.title, ha.category
        ORDER BY views DESC
        LIMIT 10
      ) t
    ),
    'searches_no_results', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT query, COUNT(*)::int AS count
        FROM public.help_search_events
        WHERE had_results = false
          AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY query
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'total_views', (
      SELECT COUNT(*)::int FROM public.help_article_views
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'total_searches', (
      SELECT COUNT(*)::int FROM public.help_search_events
      WHERE created_at >= now() - (p_days || ' days')::interval
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_help_analytics_summary(int) TO authenticated;

DROP POLICY IF EXISTS help_articles_admin_write ON public.help_articles;
CREATE POLICY help_articles_admin_write ON public.help_articles
  FOR ALL USING (
    public.is_help_center_admin()
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
    )
  );

GRANT SELECT ON public.help_articles TO anon, authenticated;
GRANT INSERT ON public.help_article_views TO anon, authenticated;
GRANT SELECT ON public.help_article_views TO authenticated;
GRANT INSERT ON public.help_search_events TO anon, authenticated;
GRANT SELECT ON public.help_search_events TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_callbacks TO authenticated;

NOTIFY pgrst, 'reload schema';
