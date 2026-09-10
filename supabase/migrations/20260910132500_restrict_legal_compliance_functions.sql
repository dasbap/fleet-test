revoke all on function public.enforce_assignment_legal_compliance() from public, anon, authenticated;

revoke all on function public.is_driver_legally_compliant(uuid) from public, anon;
grant execute on function public.is_driver_legally_compliant(uuid) to authenticated;

revoke all on function public.is_vehicle_legally_compliant(uuid) from public, anon;
grant execute on function public.is_vehicle_legally_compliant(uuid) to authenticated;
