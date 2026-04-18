-- Exposition des RPC funnel pour le client (JWT authentifié)
grant execute on function public.track_funnel_event(uuid, text, smallint, text, jsonb, timestamptz) to authenticated;
grant execute on function public.get_funnel_metrics(uuid, integer) to authenticated;
