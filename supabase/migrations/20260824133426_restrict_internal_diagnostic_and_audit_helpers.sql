begin;

revoke execute on function public.liste_migrations_appliquees()
  from public, anon, authenticated;
grant execute on function public.liste_migrations_appliquees()
  to service_role;

revoke execute on function public.admin_log_action(uuid, text, text, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_log_action(uuid, text, text, uuid, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
