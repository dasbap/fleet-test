-- V3 #21 — Intégration dashcam AI low-cost
-- Supporte : RTSP/MJPEG generics, Hikvision, 4G cams
-- Analyse IA : fatigue, téléphone, distraction, sortie de voie

DO $$ BEGIN
  CREATE TYPE dashcam_brand AS ENUM ('generic_rtsp', 'hikvision', 'dahua', '4g_lte', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dashcam_alert_type AS ENUM (
    'fatigue', 'phone_use', 'distraction', 'lane_departure',
    'tailgating', 'harsh_braking', 'speeding', 'smoking'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dashcam_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Dashcams enregistrées ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dashcams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id        uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id      uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  name            text NOT NULL,
  brand           public.dashcam_brand NOT NULL DEFAULT 'generic_rtsp',
  stream_url      text,                 -- RTSP ou MJPEG URL (chiffrée)
  api_endpoint    text,                 -- Pour Hikvision ISAPI
  api_key_hash    text,                 -- SHA-256 de la clé API camera
  channel         smallint DEFAULT 1,   -- Canal vidéo (multi-cam)
  is_active       boolean NOT NULL DEFAULT true,
  last_seen_at    timestamptz,
  firmware_ver    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashcams_fleet ON public.dashcams(fleet_id);
CREATE INDEX IF NOT EXISTS idx_dashcams_vehicle ON public.dashcams(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashcams_active ON public.dashcams(fleet_id, is_active) WHERE is_active = true;

-- ─── Alertes IA dashcam ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dashcam_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashcam_id      uuid NOT NULL REFERENCES public.dashcams(id) ON DELETE CASCADE,
  fleet_id        uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id      uuid REFERENCES public.vehicules(id) ON DELETE SET NULL,
  driver_user_id  uuid REFERENCES public.profils(user_id) ON DELETE SET NULL,
  alert_type      public.dashcam_alert_type NOT NULL,
  severity        public.dashcam_alert_severity NOT NULL DEFAULT 'medium',
  confidence      numeric(4,3) NOT NULL DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
  snapshot_url    text,                 -- URL Storage du snapshot
  video_clip_url  text,                 -- URL clip 30s (optionnel)
  gps_lat         numeric(10,7),
  gps_lon         numeric(10,7),
  speed_kmh       numeric(5,1),
  ai_provider     text DEFAULT 'rule-based', -- 'rule-based' | 'openai-vision' | 'aws-rekognition'
  ai_raw_response jsonb,
  acknowledged    boolean NOT NULL DEFAULT false,
  ack_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ack_at          timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashcam_alerts_fleet_created
  ON public.dashcam_alerts(fleet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashcam_alerts_vehicle
  ON public.dashcam_alerts(vehicle_id, created_at DESC) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashcam_alerts_driver
  ON public.dashcam_alerts(driver_user_id, created_at DESC) WHERE driver_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dashcam_alerts_type_severity
  ON public.dashcam_alerts(alert_type, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashcam_alerts_unack
  ON public.dashcam_alerts(fleet_id, acknowledged) WHERE acknowledged = false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.dashcams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashcam_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashcams_fleet_select ON public.dashcams;
CREATE POLICY dashcams_fleet_select ON public.dashcams FOR SELECT USING (
  public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
  OR public.has_role(fleet_id, 'mechanic'::public.role_type)
);

DROP POLICY IF EXISTS dashcams_fleet_write ON public.dashcams;
CREATE POLICY dashcams_fleet_write ON public.dashcams FOR ALL USING (
  public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
) WITH CHECK (
  public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
);

DROP POLICY IF EXISTS dashcam_alerts_fleet_select ON public.dashcam_alerts;
CREATE POLICY dashcam_alerts_fleet_select ON public.dashcam_alerts FOR SELECT USING (
  public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
  OR public.has_role(fleet_id, 'mechanic'::public.role_type)
  OR (public.has_role(fleet_id, 'driver'::public.role_type) AND auth.uid() = driver_user_id)
);

DROP POLICY IF EXISTS dashcam_alerts_service_insert ON public.dashcam_alerts;
CREATE POLICY dashcam_alerts_service_insert ON public.dashcam_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS dashcam_alerts_ack_update ON public.dashcam_alerts;
CREATE POLICY dashcam_alerts_ack_update ON public.dashcam_alerts FOR UPDATE USING (
  public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
);

-- ─── Vue résumé alertes 24h ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_dashcam_alerts_24h AS
SELECT
  da.fleet_id,
  da.vehicle_id,
  da.driver_user_id,
  da.alert_type,
  da.severity,
  COUNT(*) AS alert_count,
  MAX(da.created_at) AS last_alert_at,
  BOOL_OR(NOT da.acknowledged) AS has_unacknowledged
FROM public.dashcam_alerts da
WHERE da.created_at >= now() - interval '24 hours'
GROUP BY da.fleet_id, da.vehicle_id, da.driver_user_id, da.alert_type, da.severity;

GRANT SELECT ON public.v_dashcam_alerts_24h TO authenticated;
