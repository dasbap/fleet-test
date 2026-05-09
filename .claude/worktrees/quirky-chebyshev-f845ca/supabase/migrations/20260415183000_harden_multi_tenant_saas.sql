BEGIN;

-- Durcissement des RPC sensibles: ne pas exposer aux utilisateurs anonymes.
REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM anon;

-- Contrainte d'unicité pour garantir l'upsert onboarding par organisation.
DO $$
BEGIN
  IF to_regclass('public.onboarding_progress') IS NOT NULL THEN
    -- Nettoyage défensif des doublons historiques: on garde la ligne la plus récente par org.
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY org_id
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        ) AS rn
      FROM public.onboarding_progress
    )
    DELETE FROM public.onboarding_progress op
    USING ranked r
    WHERE op.id = r.id
      AND r.rn > 1;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'onboarding_progress_org_id_key'
    ) THEN
      ALTER TABLE public.onboarding_progress
        ADD CONSTRAINT onboarding_progress_org_id_key UNIQUE (org_id);
    END IF;
  END IF;
END $$;

-- Activer RLS sur paiements si absent.
ALTER TABLE IF EXISTS public.paiements ENABLE ROW LEVEL SECURITY;

-- Policies paiements: accès strict aux managers/organizers de l'organisation.
DROP POLICY IF EXISTS paiements_select_manager_org ON public.paiements;
CREATE POLICY paiements_select_manager_org
ON public.paiements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    JOIN public.flottes f ON f.id = fa.fleet_id
    WHERE f.org_id = paiements.org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role IN ('organizer', 'manager')
  )
);

DROP POLICY IF EXISTS paiements_insert_manager_org ON public.paiements;
CREATE POLICY paiements_insert_manager_org
ON public.paiements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    JOIN public.flottes f ON f.id = fa.fleet_id
    WHERE f.org_id = paiements.org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role IN ('organizer', 'manager')
  )
);

DROP POLICY IF EXISTS paiements_update_manager_org ON public.paiements;
CREATE POLICY paiements_update_manager_org
ON public.paiements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    JOIN public.flottes f ON f.id = fa.fleet_id
    WHERE f.org_id = paiements.org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role IN ('organizer', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    JOIN public.flottes f ON f.id = fa.fleet_id
    WHERE f.org_id = paiements.org_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role IN ('organizer', 'manager')
  )
);

COMMIT;
