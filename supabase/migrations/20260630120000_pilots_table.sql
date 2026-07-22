-- Reconstruit depuis le schéma remote (idempotent).
-- table CRM pilotes_terrain_cemac + helper peut_gerer_pilotes_terrain
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

CREATE OR REPLACE FUNCTION public.peut_gerer_pilotes_terrain(p_fleet_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.user_id = auth.uid()
        AND fa.is_active = true
        AND fa.role IN ('organizer', 'manager')
    )
    OR (
      p_fleet_id IS NOT NULL
      AND (
        public.has_role(p_fleet_id, 'organizer'::public.role_type)
        OR public.has_role(p_fleet_id, 'manager'::public.role_type)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.peut_gerer_pilotes_terrain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peut_gerer_pilotes_terrain(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.pilotes_terrain_cemac (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  structure_name text NOT NULL,
  contact_name text,
  contact_phone text,
  contact_whatsapp text,
  country_code text NOT NULL,
  city text,
  vehicle_count_estimated integer,
  fleet_id uuid,
  assigned_sales_user_id uuid,
  status text DEFAULT 'prospect'::text NOT NULL,
  pilot_started_at timestamptz,
  pilot_ends_at timestamptz,
  converted_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pilotes_terrain_cemac_pkey PRIMARY KEY (id),
  CONSTRAINT pilotes_terrain_cemac_country_code_check
    CHECK (country_code = ANY (ARRAY['CM','TD','CF','CG','GA','GQ']::text[])),
  CONSTRAINT pilotes_terrain_cemac_status_check
    CHECK (status = ANY (ARRAY['prospect','demo_done','pilot_active','converted','churned']::text[])),
  CONSTRAINT pilotes_terrain_cemac_vehicle_count_estimated_check
    CHECK (vehicle_count_estimated IS NULL OR vehicle_count_estimated >= 0)
);

COMMENT ON TABLE public.pilotes_terrain_cemac IS
  'CRM leger des pilotes terrain CEMAC (structures, cycle prospect -> pilote -> conversion).';

CREATE INDEX IF NOT EXISTS idx_pilotes_terrain_cemac_assigned_sales
  ON public.pilotes_terrain_cemac (assigned_sales_user_id)
  WHERE assigned_sales_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pilotes_terrain_cemac_country
  ON public.pilotes_terrain_cemac (country_code);
CREATE INDEX IF NOT EXISTS idx_pilotes_terrain_cemac_fleet
  ON public.pilotes_terrain_cemac (fleet_id)
  WHERE fleet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pilotes_terrain_cemac_status
  ON public.pilotes_terrain_cemac (status);

DO $$ BEGIN
  ALTER TABLE public.pilotes_terrain_cemac
    ADD CONSTRAINT pilotes_terrain_cemac_assigned_sales_user_id_fkey
    FOREIGN KEY (assigned_sales_user_id) REFERENCES public.profils(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pilotes_terrain_cemac
    ADD CONSTRAINT pilotes_terrain_cemac_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_pilotes_terrain_cemac_updated_at ON public.pilotes_terrain_cemac;
CREATE TRIGGER trg_pilotes_terrain_cemac_updated_at
  BEFORE UPDATE ON public.pilotes_terrain_cemac
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pilotes_terrain_cemac ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilotes_terrain_insert ON public.pilotes_terrain_cemac;
CREATE POLICY pilotes_terrain_insert ON public.pilotes_terrain_cemac
  FOR INSERT TO authenticated
  WITH CHECK (
    assigned_sales_user_id = auth.uid()
    OR public.peut_gerer_pilotes_terrain(fleet_id)
  );

DROP POLICY IF EXISTS pilotes_terrain_select ON public.pilotes_terrain_cemac;
CREATE POLICY pilotes_terrain_select ON public.pilotes_terrain_cemac
  FOR SELECT TO authenticated
  USING (
    assigned_sales_user_id = auth.uid()
    OR public.peut_gerer_pilotes_terrain(fleet_id)
  );

DROP POLICY IF EXISTS pilotes_terrain_update ON public.pilotes_terrain_cemac;
CREATE POLICY pilotes_terrain_update ON public.pilotes_terrain_cemac
  FOR UPDATE TO authenticated
  USING (
    assigned_sales_user_id = auth.uid()
    OR public.peut_gerer_pilotes_terrain(fleet_id)
  )
  WITH CHECK (
    assigned_sales_user_id = auth.uid()
    OR public.peut_gerer_pilotes_terrain(fleet_id)
  );

GRANT ALL ON TABLE public.pilotes_terrain_cemac TO authenticated, service_role;
