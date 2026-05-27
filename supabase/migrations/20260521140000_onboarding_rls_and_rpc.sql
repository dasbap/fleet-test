-- Corrige les échecs upsert onboarding_progress (RLS + conflit org_id unique).
-- Les organizers/managers de l'org peuvent lire/écrire la progression de leur organisation.

BEGIN;

-- Accès : membre actif organizer/manager d'une flotte de l'organisation
CREATE OR REPLACE FUNCTION public.user_can_manage_org_onboarding(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      INNER JOIN public.flottes f ON f.id = fa.fleet_id
      WHERE f.org_id = p_org_id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role::text IN ('organizer', 'manager')
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_org_onboarding(uuid) TO authenticated;

COMMENT ON FUNCTION public.user_can_manage_org_onboarding(uuid) IS
  'Vrai si l''utilisateur courant est organizer/manager d''une flotte de l''organisation.';

DROP POLICY IF EXISTS "org members only" ON public.onboarding_progress;

DROP POLICY IF EXISTS onboarding_progress_select ON public.onboarding_progress;
CREATE POLICY onboarding_progress_select ON public.onboarding_progress
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.user_can_manage_org_onboarding(org_id)
  );

DROP POLICY IF EXISTS onboarding_progress_insert ON public.onboarding_progress;
CREATE POLICY onboarding_progress_insert ON public.onboarding_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_can_manage_org_onboarding(org_id)
  );

DROP POLICY IF EXISTS onboarding_progress_update ON public.onboarding_progress;
CREATE POLICY onboarding_progress_update ON public.onboarding_progress
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.user_can_manage_org_onboarding(org_id)
  )
  WITH CHECK (
    public.user_can_manage_org_onboarding(org_id)
  );

-- Upsert atomique côté serveur (évite les angles morts PostgREST ON CONFLICT + RLS)
CREATE OR REPLACE FUNCTION public.sauvegarder_progression_onboarding(
  p_org_id uuid,
  p_step integer,
  p_completed boolean,
  p_steps_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.onboarding_progress;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'org_id_requis';
  END IF;

  IF p_step IS NULL OR p_step < 1 OR p_step > 4 THEN
    RAISE EXCEPTION 'etape_invalide';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'Permission refusée pour cette organisation.';
  END IF;

  INSERT INTO public.onboarding_progress (
    org_id,
    user_id,
    step,
    completed,
    steps_data,
    updated_at
  )
  VALUES (
    p_org_id,
    v_uid,
    p_step,
    COALESCE(p_completed, false),
    COALESCE(p_steps_data, '{}'::jsonb),
    now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    step = EXCLUDED.step,
    completed = EXCLUDED.completed,
    steps_data = EXCLUDED.steps_data,
    updated_at = now(),
    user_id = CASE
      WHEN onboarding_progress.user_id = v_uid THEN onboarding_progress.user_id
      ELSE v_uid
    END
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sauvegarder_progression_onboarding(uuid, integer, boolean, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.finaliser_onboarding(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF NOT public.user_can_manage_org_onboarding(p_org_id) THEN
    RAISE EXCEPTION 'Permission refusée pour cette organisation.';
  END IF;

  UPDATE public.onboarding_progress
  SET completed = true, updated_at = now()
  WHERE org_id = p_org_id;

  IF NOT FOUND THEN
    INSERT INTO public.onboarding_progress (org_id, user_id, step, completed, steps_data)
    VALUES (p_org_id, auth.uid(), 4, true, '{}'::jsonb);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finaliser_onboarding(uuid) TO authenticated;

COMMIT;
