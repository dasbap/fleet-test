-- Dashboard : droits RPC/vue + colonnes snake_case alignées sur le client TypeScript.

GRANT EXECUTE ON FUNCTION public.get_kpi_summary(uuid) TO authenticated;
GRANT SELECT ON public.dashboard_alerts TO authenticated;

CREATE OR REPLACE VIEW public.dashboard_alerts AS
SELECT
  a.id,
  a.org_id,
  a.vehicle_id,
  v.plate,
  v.brand || ' ' || v.model AS vehicle_name,
  a.severity,
  a.type,
  a.message,
  a.created_at,
  a.resolved_at,
  CASE a.severity
    WHEN 'critical' THEN 1
    WHEN 'warning'  THEN 2
    ELSE 3
  END AS severity_rank,
  jsonb_build_object(
    'kind', CASE a.type
      WHEN 'oil'      THEN 'schedule'
      WHEN 'brakes'   THEN 'immobilize'
      WHEN 'revision' THEN 'book'
      WHEN 'tires'    THEN 'order'
      WHEN 'ct'       THEN 'plan'
      ELSE 'schedule'
    END,
    'label', CASE a.type
      WHEN 'oil'      THEN 'Planifier →'
      WHEN 'brakes'   THEN 'Immobiliser →'
      WHEN 'revision' THEN 'Réserver →'
      WHEN 'tires'    THEN 'Commander →'
      WHEN 'ct'       THEN 'Planifier CT →'
      ELSE 'Traiter →'
    END,
    'payload', jsonb_build_object(
      'alertId',   a.id,
      'vehicleId', a.vehicle_id,
      'orgId',     a.org_id,
      'type',      a.type
    )
  ) AS action
FROM public.alerts a
JOIN public.vehicles v ON v.id = a.vehicle_id
WHERE a.resolved_at IS NULL;

COMMENT ON VIEW public.dashboard_alerts IS
  'Alertes actives enrichies pour le tableau de bord (colonnes snake_case, RLS via security_invoker sur alerts/vehicles).';
