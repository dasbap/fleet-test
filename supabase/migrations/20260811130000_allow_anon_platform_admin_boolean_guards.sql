-- Avoid noisy 401s while the client session is still settling. These boolean
-- guards return false when auth.uid() is null, so anon execution does not grant
-- platform access.

grant execute on function public.is_platform_admin() to anon, authenticated;
grant execute on function public.is_platform_super_admin() to anon, authenticated;

notify pgrst, 'reload schema';
