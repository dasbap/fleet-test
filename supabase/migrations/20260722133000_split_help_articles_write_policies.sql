-- Keep public help article reads independent from admin/fleet write checks.
-- A FOR ALL write policy is also evaluated for SELECT and can make anon reads
-- fail when nested fleet RLS policies call admin-only helper functions.

drop policy if exists help_articles_admin_write on public.help_articles;
drop policy if exists help_articles_admin_insert on public.help_articles;
drop policy if exists help_articles_admin_update on public.help_articles;
drop policy if exists help_articles_admin_delete on public.help_articles;

drop policy if exists help_articles_public_read on public.help_articles;
create policy help_articles_public_read on public.help_articles
  for select
  using (is_published = true);

create policy help_articles_admin_insert on public.help_articles
  for insert
  to authenticated
  with check (
    public.is_help_center_admin()
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
    public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  )
  with check (
    public.is_help_center_admin()
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
    public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  );

grant execute on function public.is_help_center_admin() to anon, authenticated;
grant select on public.help_articles to anon, authenticated;

notify pgrst, 'reload schema';
