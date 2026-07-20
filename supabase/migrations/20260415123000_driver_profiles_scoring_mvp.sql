BEGIN;

-- =====================================================
-- Module conducteurs MVP : profil RH, permis et scoring v1
-- =====================================================

-- 1) Extension legere du profil RH conducteur
ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS rh_notes text;

ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_contract_type_check;
ALTER TABLE public.profils
  ADD CONSTRAINT profils_contract_type_check
  CHECK (contract_type IS NULL OR contract_type IN ('cdi', 'cdd', 'interim', 'consultant', 'other'));

ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_employment_status_check;
ALTER TABLE public.profils
  ADD CONSTRAINT profils_employment_status_check
  CHECK (employment_status IS NULL OR employment_status IN ('active', 'suspended', 'inactive'));

-- 2) Permis conducteur (1:n)
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

DROP TRIGGER IF EXISTS trg_driver_licenses_updated_at ON public.driver_licenses;
CREATE TRIGGER trg_driver_licenses_updated_at
BEFORE UPDATE ON public.driver_licenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_driver_licenses_fleet_driver_created
  ON public.driver_licenses(fleet_id, driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_verification_status
  ON public.driver_licenses(verification_status);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_expires_at
  ON public.driver_licenses(expires_at);

-- 3) Statut de resolution incident (pour mesurer le delai de cloture)
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents
  DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_status_check
  CHECK (status IN ('open', 'investigating', 'resolved', 'closed'));

CREATE INDEX IF NOT EXISTS idx_incidents_fleet_driver_created
  ON public.incidents(driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status_resolved_at
  ON public.incidents(status, resolved_at);

-- 4) Snapshots de score et versioning de modele
ALTER TABLE public.scores_conducteurs
  ADD COLUMN IF NOT EXISTS score_total numeric(5,2),
  ADD COLUMN IF NOT EXISTS incidents_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS closure_delay_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS shift_discipline_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS operational_stability_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS model_version text NOT NULL DEFAULT 'v1-hybrid',
  ADD COLUMN IF NOT EXISTS model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.driver_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE CASCADE,
  score_level public.driver_score_level NOT NULL,
  score_total numeric(5,2) NOT NULL CHECK (score_total >= 0 AND score_total <= 100),
  incidents_score numeric(5,2) NOT NULL CHECK (incidents_score >= 0 AND incidents_score <= 100),
  closure_delay_score numeric(5,2) NOT NULL CHECK (closure_delay_score >= 0 AND closure_delay_score <= 100),
  shift_discipline_score numeric(5,2) NOT NULL CHECK (shift_discipline_score >= 0 AND shift_discipline_score <= 100),
  operational_stability_score numeric(5,2) NOT NULL CHECK (operational_stability_score >= 0 AND operational_stability_score <= 100),
  model_version text NOT NULL,
  model_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_score_snapshots_fleet_driver_created
  ON public.driver_score_snapshots(fleet_id, driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_score_snapshots_calculated_at
  ON public.driver_score_snapshots(calculated_at DESC);

-- 5) RLS : activation + politiques
ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_score_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_licenses_select_roles ON public.driver_licenses;
CREATE POLICY driver_licenses_select_roles ON public.driver_licenses
FOR SELECT USING (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
  OR public.has_role(fleet_id, 'mechanic'::public.role_type)
  OR (
    public.has_role(fleet_id, 'driver'::public.role_type)
    AND auth.uid() = driver_user_id
  )
);

DROP POLICY IF EXISTS driver_licenses_insert_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_insert_manager_org ON public.driver_licenses
FOR INSERT WITH CHECK (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
);

DROP POLICY IF EXISTS driver_licenses_update_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_update_manager_org ON public.driver_licenses
FOR UPDATE USING (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
) WITH CHECK (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
);

DROP POLICY IF EXISTS driver_licenses_delete_manager_org ON public.driver_licenses;
CREATE POLICY driver_licenses_delete_manager_org ON public.driver_licenses
FOR DELETE USING (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
);

DROP POLICY IF EXISTS driver_score_snapshots_select_roles ON public.driver_score_snapshots;
CREATE POLICY driver_score_snapshots_select_roles ON public.driver_score_snapshots
FOR SELECT USING (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
  OR public.has_role(fleet_id, 'mechanic'::public.role_type)
  OR (
    public.has_role(fleet_id, 'driver'::public.role_type)
    AND auth.uid() = driver_user_id
  )
);

DROP POLICY IF EXISTS driver_score_snapshots_insert_manager_org ON public.driver_score_snapshots;
CREATE POLICY driver_score_snapshots_insert_manager_org ON public.driver_score_snapshots
FOR INSERT WITH CHECK (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  OR public.has_role(fleet_id, 'manager'::public.role_type)
);

-- 6) Scoring v1 hybride (transparent + versionne)
CREATE OR REPLACE FUNCTION public.calculer_score_conducteur_v2(
  p_driver_user_id uuid,
  p_fleet_id uuid,
  p_model_version text DEFAULT 'v1-hybrid'
)
RETURNS public.driver_score_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_count int := 0;
  v_weighted_incidents numeric := 0;
  v_incidents_score numeric(5,2) := 100;
  v_shift_closed_count int := 0;
  v_shift_pending_count int := 0;
  v_shift_discipline_score numeric(5,2) := 100;
  v_avg_resolution_hours numeric := 0;
  v_closure_delay_score numeric(5,2) := 100;
  v_operational_stability_score numeric(5,2) := 80;
  v_score_total numeric(5,2);
  v_score_level public.driver_score_level;
  v_meta jsonb;
BEGIN
  -- Incidents des 30 derniers jours
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(
      CASE i.severity
        WHEN 'critical' THEN 8
        WHEN 'high' THEN 5
        WHEN 'medium' THEN 3
        ELSE 1
      END
    ), 0)::numeric
  INTO v_incident_count, v_weighted_incidents
  FROM public.incidents i
  JOIN public.vehicules v ON v.id = i.vehicle_id
  WHERE i.driver_user_id = p_driver_user_id
    AND v.fleet_id = p_fleet_id
    AND i.created_at >= now() - interval '30 days';

  v_incidents_score := GREATEST(0, LEAST(100, 100 - (v_weighted_incidents * 4)));

  -- Discipline de cloture (creneaux fermes / clotures en attente)
  SELECT
    COUNT(*) FILTER (WHERE c.status = 'closed')::int,
    COUNT(*) FILTER (WHERE cc.status = 'pending')::int
  INTO v_shift_closed_count, v_shift_pending_count
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  LEFT JOIN public.clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND c.started_at >= now() - interval '30 days';

  v_shift_discipline_score := CASE
    WHEN v_shift_closed_count = 0 THEN 80
    ELSE GREATEST(0, LEAST(100, 100 - ((v_shift_pending_count::numeric / v_shift_closed_count::numeric) * 100)))
  END;

  -- Delai de resolution incidents (heures moyennes)
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600), 0)::numeric
  INTO v_avg_resolution_hours
  FROM public.incidents i
  JOIN public.vehicules v ON v.id = i.vehicle_id
  WHERE i.driver_user_id = p_driver_user_id
    AND v.fleet_id = p_fleet_id
    AND i.resolved_at IS NOT NULL
    AND i.created_at >= now() - interval '30 days';

  v_closure_delay_score := CASE
    WHEN v_avg_resolution_hours = 0 THEN 80
    WHEN v_avg_resolution_hours <= 12 THEN 100
    WHEN v_avg_resolution_hours <= 24 THEN 85
    WHEN v_avg_resolution_hours <= 48 THEN 70
    ELSE 50
  END;

  -- Stabilite operationnelle (activite validee)
  SELECT CASE
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') = 0 THEN 60
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') >= 15 THEN 100
      WHEN COUNT(*) FILTER (WHERE cc.status = 'validated') >= 8 THEN 85
      ELSE 72
    END::numeric(5,2)
  INTO v_operational_stability_score
  FROM public.creneaux_conducteurs c
  JOIN public.affectations_vehicules a ON a.id = c.assignment_id
  LEFT JOIN public.clotures_creneaux cc ON cc.shift_id = c.id
  WHERE a.driver_user_id = p_driver_user_id
    AND a.fleet_id = p_fleet_id
    AND c.started_at >= now() - interval '30 days';

  -- Ponderation hybride v1
  v_score_total := ROUND(
    (v_incidents_score * 0.35)
    + (v_closure_delay_score * 0.25)
    + (v_shift_discipline_score * 0.25)
    + (v_operational_stability_score * 0.15),
    2
  );

  IF v_score_total >= 80 THEN
    v_score_level := 'green';
  ELSIF v_score_total >= 60 THEN
    v_score_level := 'orange';
  ELSE
    v_score_level := 'red';
  END IF;

  v_meta := jsonb_build_object(
    'window_days', 30,
    'incident_count', v_incident_count,
    'weighted_incidents', v_weighted_incidents,
    'avg_resolution_hours', v_avg_resolution_hours,
    'shift_closed_count', v_shift_closed_count,
    'shift_pending_count', v_shift_pending_count
  );

  INSERT INTO public.scores_conducteurs (
    driver_user_id,
    fleet_id,
    score_level,
    financial_score,
    score_total,
    incidents_score,
    closure_delay_score,
    shift_discipline_score,
    operational_stability_score,
    model_version,
    model_metadata,
    last_calculated_at
  )
  VALUES (
    p_driver_user_id,
    p_fleet_id,
    v_score_level,
    v_score_total,
    v_score_total,
    v_incidents_score,
    v_closure_delay_score,
    v_shift_discipline_score,
    v_operational_stability_score,
    p_model_version,
    v_meta,
    now()
  )
  ON CONFLICT (driver_user_id, fleet_id)
  DO UPDATE SET
    score_level = EXCLUDED.score_level,
    financial_score = EXCLUDED.financial_score,
    score_total = EXCLUDED.score_total,
    incidents_score = EXCLUDED.incidents_score,
    closure_delay_score = EXCLUDED.closure_delay_score,
    shift_discipline_score = EXCLUDED.shift_discipline_score,
    operational_stability_score = EXCLUDED.operational_stability_score,
    model_version = EXCLUDED.model_version,
    model_metadata = EXCLUDED.model_metadata,
    last_calculated_at = EXCLUDED.last_calculated_at;

  INSERT INTO public.driver_score_snapshots (
    fleet_id,
    driver_user_id,
    score_level,
    score_total,
    incidents_score,
    closure_delay_score,
    shift_discipline_score,
    operational_stability_score,
    model_version,
    model_metadata,
    calculated_at
  )
  VALUES (
    p_fleet_id,
    p_driver_user_id,
    v_score_level,
    v_score_total,
    v_incidents_score,
    v_closure_delay_score,
    v_shift_discipline_score,
    v_operational_stability_score,
    p_model_version,
    v_meta,
    now()
  );

  RETURN v_score_level;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculer_score_conducteur_v2(uuid, uuid, text) TO authenticated;

COMMIT;
