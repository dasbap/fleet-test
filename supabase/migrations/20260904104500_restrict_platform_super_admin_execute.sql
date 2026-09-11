revoke execute on function public.is_platform_super_admin() from public;
revoke execute on function public.is_platform_super_admin() from anon;
grant execute on function public.is_platform_super_admin() to authenticated;
grant execute on function public.is_platform_super_admin() to service_role;
