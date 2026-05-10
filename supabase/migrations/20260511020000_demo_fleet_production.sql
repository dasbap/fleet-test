-- ═══════════════════════════════════════════════════════════════════════════
-- Migration : Données démo production-ready E-Samba
-- Schéma réel : organisations(country_code), flottes(org_id), vehicules(registration/current_km/status enum)
-- Les comptes utilisateurs sont créés manuellement via Supabase Auth Dashboard
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Table demandes de démo (landing page formulaire) ─────────────────────
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  company     text,
  phone       text NOT NULL,
  fleet_size  int,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'demo_done', 'converted')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demo_requests_public_insert ON public.demo_requests;
CREATE POLICY demo_requests_public_insert ON public.demo_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS demo_requests_no_select ON public.demo_requests;
CREATE POLICY demo_requests_no_select ON public.demo_requests
  FOR SELECT USING (false);

-- ─── Flotte démo ──────────────────────────────────────────────────────────
DO $$
DECLARE
  v_org_id    uuid := 'a1b2c3d4-0002-0002-0002-000000000002'::uuid;
  v_fleet_id  uuid := 'a1b2c3d4-0001-0001-0001-000000000001'::uuid;

  v_veh1 uuid := 'a1b2c3d4-1001-1001-1001-000000000011'::uuid;
  v_veh2 uuid := 'a1b2c3d4-1002-1002-1002-000000000012'::uuid;
  v_veh3 uuid := 'a1b2c3d4-1003-1003-1003-000000000013'::uuid;
  v_veh4 uuid := 'a1b2c3d4-1004-1004-1004-000000000014'::uuid;
  v_veh5 uuid := 'a1b2c3d4-1005-1005-1005-000000000015'::uuid;
  v_veh6 uuid := 'a1b2c3d4-1006-1006-1006-000000000016'::uuid;
  v_veh7 uuid := 'a1b2c3d4-1007-1007-1007-000000000017'::uuid;
  v_veh8 uuid := 'a1b2c3d4-1008-1008-1008-000000000018'::uuid;
BEGIN

  -- Organisation
  INSERT INTO public.organisations (id, name, country_code, created_at)
  VALUES (v_org_id, 'Trans-Douala Group (Démo)', 'CM', now())
  ON CONFLICT (id) DO NOTHING;

  -- Flotte principale
  INSERT INTO public.flottes (id, org_id, name, collection_policy, created_at)
  VALUES (v_fleet_id, v_org_id, 'Trans-Douala Express', 'mix', now())
  ON CONFLICT (id) DO NOTHING;

  -- 8 véhicules réalistes Douala/Yaoundé
  -- status: 'ok' | 'blocked' (enum vehicle_status)
  INSERT INTO public.vehicules (id, fleet_id, registration, brand, model, year, current_km, status, created_at)
  VALUES
    (v_veh1, v_fleet_id, 'LT-2024-DL', 'Toyota',      'HiAce',           2022, 87430,  'ok',      now() - interval '18 months'),
    (v_veh2, v_fleet_id, 'LT-2019-DL', 'Toyota',      'Corolla',         2019, 142800, 'ok',      now() - interval '24 months'),
    (v_veh3, v_fleet_id, 'LT-2021-DL', 'Mitsubishi',  'L300',            2021, 63200,  'ok',      now() - interval '12 months'),
    (v_veh4, v_fleet_id, 'LT-2020-DL', 'Mercedes',    'Sprinter',        2020, 108900, 'ok',      now() - interval '30 months'),
    (v_veh5, v_fleet_id, 'LT-2023-DL', 'Hyundai',     'H350',            2023, 31500,  'ok',      now() - interval '6 months'),
    (v_veh6, v_fleet_id, 'LT-2018-DL', 'Toyota',      'Land Cruiser 78', 2018, 198400, 'blocked', now() - interval '48 months'),
    (v_veh7, v_fleet_id, 'LT-2022-DL', 'Renault',     'Master',          2022, 54700,  'ok',      now() - interval '15 months'),
    (v_veh8, v_fleet_id, 'LT-2023-YD', 'Toyota',      'HiAce GL',        2023, 22100,  'ok',      now() - interval '4 months')
  ON CONFLICT (fleet_id, registration) DO UPDATE
    SET current_km = EXCLUDED.current_km,
        status     = EXCLUDED.status;

  -- Marquer le veh6 bloqué avec raison
  UPDATE public.vehicules
    SET blocked_reason = 'Freins usés — en attente pièces'
  WHERE id = v_veh6;

  -- Travaux maintenance démo (sans FK user requis)
  INSERT INTO public.travaux_maintenance (fleet_id, vehicle_id, priority, status, created_at)
  VALUES
    (v_fleet_id, v_veh6, 'urgent',  'queued',    now() - interval '1 day'),
    (v_fleet_id, v_veh2, 'high',    'in_progress', now() - interval '3 days'),
    (v_fleet_id, v_veh4, 'medium',  'queued',    now() - interval '5 days')
  ON CONFLICT DO NOTHING;

END $$;

-- ─── Vue démo pour le dashboard (accessible sans auth pour les démos guidées) ─
-- Note : les vraies données nécessitent un compte adhérent à la flotte démo.
-- Les comptes démo sont créés via : Supabase Auth Dashboard > Authentication > Users
-- demo-admin@e-samba.com    / mot de passe communiqué lors de la démo
-- demo-manager@e-samba.com  / mot de passe communiqué lors de la démo
-- demo-driver@e-samba.com   / mot de passe communiqué lors de la démo
