-- ============================================================
-- 04_rls_policies.sql — E-Samba
-- Policies RLS canoniques par rôle et domaine.
-- Idempotent : DROP IF EXISTS + CREATE.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- HELPERS (doivent exister avant les policies)
-- ════════════════════════════════════════════════════════════

-- is_platform_admin() doit exister (voir 05_rpc_functions.sql)
-- user_can_manage_org_onboarding() idem

-- ════════════════════════════════════════════════════════════
-- profils
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profils_select_own       ON public.profils;
DROP POLICY IF EXISTS profils_select_admin     ON public.profils;
DROP POLICY IF EXISTS profils_select_fleet     ON public.profils;
DROP POLICY IF EXISTS profils_insert_own       ON public.profils;
DROP POLICY IF EXISTS profils_update_own       ON public.profils;
DROP POLICY IF EXISTS profils_update_admin     ON public.profils;

-- Lire son propre profil
CREATE POLICY profils_select_own ON public.profils
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin platform : tout lire
CREATE POLICY profils_select_admin ON public.profils
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Membres de la même flotte (organizer/manager peuvent voir leurs membres)
CREATE POLICY profils_select_fleet ON public.profils
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa1
      JOIN public.flotte_adhesions fa2 ON fa2.fleet_id = fa1.fleet_id
      WHERE fa1.user_id = auth.uid()
        AND fa1.is_active = true
        AND fa1.role::text IN ('organizer', 'manager')
        AND fa2.user_id = profils.user_id
        AND fa2.is_active = true
    )
  );

-- Créer son propre profil (signup)
CREATE POLICY profils_insert_own ON public.profils
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Modifier son propre profil
CREATE POLICY profils_update_own ON public.profils
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin peut modifier tout profil
CREATE POLICY profils_update_admin ON public.profils
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ════════════════════════════════════════════════════════════
-- flottes
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.flottes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flottes_select_member   ON public.flottes;
DROP POLICY IF EXISTS flottes_select_admin    ON public.flottes;
DROP POLICY IF EXISTS flottes_insert_admin    ON public.flottes;
DROP POLICY IF EXISTS flottes_update_organizer ON public.flottes;

CREATE POLICY flottes_select_member ON public.flottes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id AND fa.user_id = auth.uid() AND fa.is_active = true
    )
    OR public.is_platform_admin()
  );

CREATE POLICY flottes_update_organizer ON public.flottes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text = 'organizer'
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- organisations
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organisations_select_member ON public.organisations;
DROP POLICY IF EXISTS organisations_update_organizer ON public.organisations;

CREATE POLICY organisations_select_member ON public.organisations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flottes f
      JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id AND fa.user_id = auth.uid() AND fa.is_active = true
    )
    OR public.is_platform_admin()
  );

CREATE POLICY organisations_update_organizer ON public.organisations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flottes f
      JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id
      WHERE f.org_id = organisations.id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text = 'organizer'
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- flotte_adhesions
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.flotte_adhesions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS adhesions_select_own        ON public.flotte_adhesions;
DROP POLICY IF EXISTS adhesions_select_manager    ON public.flotte_adhesions;
DROP POLICY IF EXISTS adhesions_insert_organizer  ON public.flotte_adhesions;
DROP POLICY IF EXISTS adhesions_update_organizer  ON public.flotte_adhesions;
DROP POLICY IF EXISTS adhesions_delete_organizer  ON public.flotte_adhesions;

-- Voir sa propre adhésion
CREATE POLICY adhesions_select_own ON public.flotte_adhesions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

-- Manager/organizer voient toute la flotte
CREATE POLICY adhesions_select_manager ON public.flotte_adhesions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flotte_adhesions.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
  );

-- Seul l'organizer peut inviter
CREATE POLICY adhesions_insert_organizer ON public.flotte_adhesions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flotte_adhesions.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text = 'organizer'
    )
    OR public.is_platform_admin()
  );

CREATE POLICY adhesions_update_organizer ON public.flotte_adhesions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flotte_adhesions.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- vehicules
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicules_select_member  ON public.vehicules;
DROP POLICY IF EXISTS vehicules_insert_manager ON public.vehicules;
DROP POLICY IF EXISTS vehicules_update_manager ON public.vehicules;

CREATE POLICY vehicules_select_member ON public.vehicules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = vehicules.fleet_id AND fa.user_id = auth.uid() AND fa.is_active = true
    )
    OR public.is_platform_admin()
  );

CREATE POLICY vehicules_insert_manager ON public.vehicules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = vehicules.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

CREATE POLICY vehicules_update_manager ON public.vehicules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = vehicules.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- affectations_vehicules
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.affectations_vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affectations_select_fleet  ON public.affectations_vehicules;
DROP POLICY IF EXISTS affectations_select_own    ON public.affectations_vehicules;
DROP POLICY IF EXISTS affectations_insert_manager ON public.affectations_vehicules;
DROP POLICY IF EXISTS affectations_update_manager ON public.affectations_vehicules;

CREATE POLICY affectations_select_fleet ON public.affectations_vehicules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = affectations_vehicules.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR driver_user_id = auth.uid()
    OR public.is_platform_admin()
  );

CREATE POLICY affectations_insert_manager ON public.affectations_vehicules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = affectations_vehicules.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- creneaux_conducteurs
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.creneaux_conducteurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creneaux_select_driver   ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS creneaux_select_manager  ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS creneaux_insert_driver   ON public.creneaux_conducteurs;
DROP POLICY IF EXISTS creneaux_update_driver   ON public.creneaux_conducteurs;

CREATE POLICY creneaux_select_driver ON public.creneaux_conducteurs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id AND av.driver_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.affectations_vehicules av
      JOIN public.flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND fa.user_id = auth.uid() AND fa.is_active = true
        AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

CREATE POLICY creneaux_insert_driver ON public.creneaux_conducteurs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id
        AND av.driver_user_id = auth.uid() AND av.is_active = true
    )
  );

CREATE POLICY creneaux_update_driver ON public.creneaux_conducteurs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affectations_vehicules av
      WHERE av.id = creneaux_conducteurs.assignment_id AND av.driver_user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════
-- clotures_creneaux
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.clotures_creneaux ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clotures_select_driver   ON public.clotures_creneaux;
DROP POLICY IF EXISTS clotures_select_manager  ON public.clotures_creneaux;
DROP POLICY IF EXISTS clotures_insert_driver   ON public.clotures_creneaux;
DROP POLICY IF EXISTS clotures_update_manager  ON public.clotures_creneaux;

CREATE POLICY clotures_select_driver ON public.clotures_creneaux
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creneaux_conducteurs cc
      JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
      WHERE cc.id = clotures_creneaux.shift_id AND av.driver_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.creneaux_conducteurs cc
      JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
      JOIN public.flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND fa.user_id = auth.uid() AND fa.is_active = true
        AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

CREATE POLICY clotures_insert_driver ON public.clotures_creneaux
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.creneaux_conducteurs cc
      JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
      WHERE cc.id = clotures_creneaux.shift_id AND av.driver_user_id = auth.uid()
    )
  );

CREATE POLICY clotures_update_manager ON public.clotures_creneaux
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creneaux_conducteurs cc
      JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
      JOIN public.flotte_adhesions fa ON fa.fleet_id = av.fleet_id
      WHERE cc.id = clotures_creneaux.shift_id
        AND fa.user_id = auth.uid() AND fa.is_active = true
        AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- scores_conducteurs
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.scores_conducteurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scores_select_own     ON public.scores_conducteurs;
DROP POLICY IF EXISTS scores_select_manager ON public.scores_conducteurs;

CREATE POLICY scores_select_own ON public.scores_conducteurs
  FOR SELECT TO authenticated
  USING (driver_user_id = auth.uid());

CREATE POLICY scores_select_manager ON public.scores_conducteurs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = scores_conducteurs.fleet_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

-- ════════════════════════════════════════════════════════════
-- incidents
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidents_select_own     ON public.incidents;
DROP POLICY IF EXISTS incidents_select_manager ON public.incidents;
DROP POLICY IF EXISTS incidents_insert_driver  ON public.incidents;

CREATE POLICY incidents_select_own ON public.incidents
  FOR SELECT TO authenticated
  USING (driver_user_id = auth.uid());

CREATE POLICY incidents_select_manager ON public.incidents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vehicules v
      JOIN public.flotte_adhesions fa ON fa.fleet_id = v.fleet_id
      WHERE v.id = incidents.vehicle_id AND fa.user_id = auth.uid()
        AND fa.is_active = true AND fa.role::text IN ('organizer', 'manager')
    )
    OR public.is_platform_admin()
  );

CREATE POLICY incidents_insert_driver ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (driver_user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- onboarding_progress (déjà fait dans 20260521140000 — idempotent)
-- ════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS onboarding_progress_select ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_insert ON public.onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_update ON public.onboarding_progress;

CREATE POLICY onboarding_progress_select ON public.onboarding_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.user_can_manage_org_onboarding(org_id));

CREATE POLICY onboarding_progress_insert ON public.onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.user_can_manage_org_onboarding(org_id));

CREATE POLICY onboarding_progress_update ON public.onboarding_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.user_can_manage_org_onboarding(org_id))
  WITH CHECK (public.user_can_manage_org_onboarding(org_id));

-- ════════════════════════════════════════════════════════════
-- audit_logs : admin only
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_auth  ON public.audit_logs;

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY audit_logs_insert_auth ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true); -- tout utilisateur authentifié peut écrire un log

-- ════════════════════════════════════════════════════════════
-- access_codes
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS access_codes_select_admin   ON public.access_codes;
DROP POLICY IF EXISTS access_codes_select_creator ON public.access_codes;
DROP POLICY IF EXISTS access_codes_insert_admin   ON public.access_codes;
DROP POLICY IF EXISTS access_codes_update_admin   ON public.access_codes;

CREATE POLICY access_codes_select_admin ON public.access_codes
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR created_by = auth.uid());

CREATE POLICY access_codes_insert_admin ON public.access_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY access_codes_update_admin ON public.access_codes
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

COMMIT;
