drop policy if exists help_articles_admin_insert on public.help_articles;
drop policy if exists help_articles_admin_update on public.help_articles;
drop policy if exists help_articles_admin_delete on public.help_articles;

create policy help_articles_admin_insert on public.help_articles
  for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  );

create policy help_articles_admin_update on public.help_articles
  for update
  to authenticated
  using (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  )
  with check (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  );

create policy help_articles_admin_delete on public.help_articles
  for delete
  to authenticated
  using (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  );

grant insert, update, delete on public.help_articles to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_help_center_admin() to authenticated;

notify pgrst, 'reload schema';
