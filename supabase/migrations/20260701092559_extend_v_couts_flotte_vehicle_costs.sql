-- Reconstruit depuis le schéma remote (idempotent).
-- etend v_couts_flotte avec vehicle_costs
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

CREATE OR REPLACE VIEW public.v_couts_flotte
WITH (security_invoker = true) AS
SELECT
  jc.fleet_id,
  jc.vehicle_id,
  jc.driver_user_id,
  'carburant'::text AS cost_type,
  jc.amount_xof,
  jc.purchased_at AS occurred_at,
  jc.id AS source_id,
  jc.created_at
FROM public.journal_carburant jc
UNION ALL
SELECT
  jp.fleet_id,
  jp.vehicle_id,
  jp.driver_user_id,
  'peage'::text AS cost_type,
  jp.amount_xof,
  jp.occurred_at,
  jp.id AS source_id,
  jp.created_at
FROM public.journal_peages jp
UNION ALL
SELECT
  vc.fleet_id,
  vc.vehicle_id,
  vc.saisi_par AS driver_user_id,
  vc.type_cout AS cost_type,
  (round(
    CASE vc.devise
      WHEN 'XAF' THEN vc.montant
      WHEN 'EUR' THEN (vc.montant * 656.0)
      WHEN 'USD' THEN ((vc.montant / 0.92) * 656.0)
      ELSE NULL::numeric
    END
  ))::integer AS amount_xof,
  (vc.date_depense::timestamp without time zone AT TIME ZONE 'UTC') AS occurred_at,
  vc.id AS source_id,
  vc.created_at
FROM public.vehicle_costs vc;

COMMENT ON VIEW public.v_couts_flotte IS
  'Union carburant + peages + couts vehicules pour rapports et tableaux de bord.';

GRANT SELECT ON TABLE public.v_couts_flotte TO authenticated;
