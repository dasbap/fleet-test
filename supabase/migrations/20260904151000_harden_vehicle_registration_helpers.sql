begin;

alter function public.normalize_vehicle_registration(text)
set search_path = pg_catalog;

revoke execute on function public.validate_vehicle_registration() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
