drop policy if exists help_articles_admin_select on public.help_articles;

create policy help_articles_admin_select on public.help_articles
  for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.is_help_center_admin()
  );

grant select on public.help_articles to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_help_center_admin() to authenticated;

notify pgrst, 'reload schema';
