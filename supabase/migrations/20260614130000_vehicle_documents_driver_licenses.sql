-- Documents flotte : vehicle_documents + driver_licenses (prod-safe, idempotent)
-- Aligné sur le modèle RLS travaux_maintenance (restrictive + permissive + demo).

-- ─── 1. vehicle_documents ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number text,
  issued_at date,
  expires_at date,
  issuer text,
  file_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_fleet_id
  ON public.vehicle_documents(fleet_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id
  ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expires_at
  ON public.vehicle_documents(expires_at)
  WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_vehicle_documents_updated_at ON public.vehicle_documents;
CREATE TRIGGER trg_vehicle_documents_updated_at
  BEFORE UPDATE ON public.vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- ─── 2. driver_licenses (si migration scoring pas encore appliquée) ─────────

CREATE TABLE IF NOT EXISTS public.driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE CASCADE,
  license_number text NOT NULL,
  license_category text NOT NULL,
  issued_at date,
  expires_at date,
  issuing_country text NOT NULL DEFAULT 'CM',
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  document_url text,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_id, driver_user_id, license_number)
);

CREATE INDEX IF NOT EXISTS idx_driver_licenses_fleet_driver_created
  ON public.driver_licenses(fleet_id, driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_expires_at
  ON public.driver_licenses(expires_at)
  WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_driver_licenses_updated_at ON public.driver_licenses;
CREATE TRIGGER trg_driver_licenses_updated_at
  BEFORE UPDATE ON public.driver_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS vehicle_documents ───────────────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_vehicle_documents ON public.vehicle_documents;
CREATE POLICY demo_isolation_vehicle_documents ON public.vehicle_documents
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = vehicle_documents.fleet_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = vehicle_documents.fleet_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS superadmin_all_vehicle_documents ON public.vehicle_documents;
CREATE POLICY superadmin_all_vehicle_documents ON public.vehicle_documents
  FOR ALL
  TO authenticated
  USING (is_app_super_admin())
  WITH CHECK (is_app_super_admin());

DROP POLICY IF EXISTS rbac_vehicle_documents_read ON public.vehicle_documents;
CREATE POLICY rbac_vehicle_documents_read ON public.vehicle_documents
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS rbac_vehicle_documents_write ON public.vehicle_documents;
CREATE POLICY rbac_vehicle_documents_write ON public.vehicle_documents
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS rbac_vehicle_documents_update ON public.vehicle_documents;
CREATE POLICY rbac_vehicle_documents_update ON public.vehicle_documents
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  )
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS rbac_vehicle_documents_delete ON public.vehicle_documents;
CREATE POLICY rbac_vehicle_documents_delete ON public.vehicle_documents
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS vehicle_documents_lecture_mgr_org_mec ON public.vehicle_documents;
CREATE POLICY vehicle_documents_lecture_mgr_org_mec ON public.vehicle_documents
  FOR SELECT
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS vehicle_documents_insertion_mgr_org_mec ON public.vehicle_documents;
CREATE POLICY vehicle_documents_insertion_mgr_org_mec ON public.vehicle_documents
  FOR INSERT
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS vehicle_documents_modification_mgr_org_mec ON public.vehicle_documents;
CREATE POLICY vehicle_documents_modification_mgr_org_mec ON public.vehicle_documents
  FOR UPDATE
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  )
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
  );

DROP POLICY IF EXISTS vehicle_documents_suppression_mgr_org ON public.vehicle_documents;
CREATE POLICY vehicle_documents_suppression_mgr_org ON public.vehicle_documents
  FOR DELETE
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

-- ─── 4. RLS driver_licenses (alignement) ────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_driver_licenses ON public.driver_licenses;
CREATE POLICY demo_isolation_driver_licenses ON public.driver_licenses
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = driver_licenses.fleet_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = driver_licenses.fleet_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS superadmin_all_driver_licenses ON public.driver_licenses;
CREATE POLICY superadmin_all_driver_licenses ON public.driver_licenses
  FOR ALL
  TO authenticated
  USING (is_app_super_admin())
  WITH CHECK (is_app_super_admin());

DROP POLICY IF EXISTS rbac_driver_licenses_read ON public.driver_licenses;
CREATE POLICY rbac_driver_licenses_read ON public.driver_licenses
  AS RESTRICTIVE
  FOR SELECT
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
    OR (has_role(fleet_id, 'driver'::role_type) AND auth.uid() = driver_user_id)
  );

DROP POLICY IF EXISTS rbac_driver_licenses_write ON public.driver_licenses;
CREATE POLICY rbac_driver_licenses_write ON public.driver_licenses
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS rbac_driver_licenses_update ON public.driver_licenses;
CREATE POLICY rbac_driver_licenses_update ON public.driver_licenses
  AS RESTRICTIVE
  FOR UPDATE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  )
  WITH CHECK (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS rbac_driver_licenses_delete ON public.driver_licenses;
CREATE POLICY rbac_driver_licenses_delete ON public.driver_licenses
  AS RESTRICTIVE
  FOR DELETE
  USING (
    is_platform_admin()
    OR is_app_super_admin()
    OR has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS driver_licenses_select_roles ON public.driver_licenses;
CREATE POLICY driver_licenses_select_roles ON public.driver_licenses
  FOR SELECT
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
    OR has_role(fleet_id, 'mechanic'::role_type)
    OR (has_role(fleet_id, 'driver'::role_type) AND auth.uid() = driver_user_id)
  );

DROP POLICY IF EXISTS driver_licenses_insert_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_insert_manager_org ON public.driver_licenses
  FOR INSERT
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS driver_licenses_update_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_update_manager_org ON public.driver_licenses
  FOR UPDATE
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  )
  WITH CHECK (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

DROP POLICY IF EXISTS driver_licenses_delete_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_delete_manager_org ON public.driver_licenses
  FOR DELETE
  USING (
    has_role(fleet_id, 'organizer'::role_type)
    OR has_role(fleet_id, 'manager'::role_type)
  );

NOTIFY pgrst, 'reload schema';
