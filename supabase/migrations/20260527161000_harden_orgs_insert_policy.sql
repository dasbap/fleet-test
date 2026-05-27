-- Durcissement création d'organisation :
-- limite la création aux utilisateurs authentifiés avec un plafond d'organisations actives.
-- Objectif : réduire les abus automatisés tout en gardant le flow onboarding.

DROP POLICY IF EXISTS orgs_insert_authenticated ON public.organisations;

CREATE POLICY orgs_insert_authenticated ON public.organisations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      SELECT COUNT(*)
      FROM public.organisations o
      WHERE EXISTS (
        SELECT 1
        FROM public.flottes f
        JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id
        WHERE f.org_id = o.id
          AND fa.user_id = auth.uid()
          AND fa.is_active = true
          AND fa.role IN ('organizer', 'manager')
      )
    ) < 5
  );
