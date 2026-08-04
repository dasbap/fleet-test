create or replace function public.admin_upsert_faq_article(
  p_id uuid default null,
  p_slug text default null,
  p_title text default null,
  p_content text default null,
  p_locale text default 'fr',
  p_sort_order integer default 0,
  p_is_published boolean default true
)
returns public.help_articles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.help_articles;
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_content text := nullif(trim(coalesce(p_content, '')), '');
  v_locale text := coalesce(nullif(trim(p_locale), ''), 'fr');
begin
  if not (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  ) then
    raise exception 'admin_required';
  end if;

  if v_slug is null or v_title is null or v_content is null then
    raise exception 'faq_article_required_fields';
  end if;

  if p_id is null then
    insert into public.help_articles (
      slug,
      title,
      category,
      role,
      locale,
      keywords,
      content,
      route_context,
      plan_min,
      module_keys,
      error_codes,
      sort_order,
      is_published
    )
    values (
      v_slug,
      v_title,
      'faq',
      array[]::text[],
      v_locale,
      array[]::text[],
      v_content,
      array['/faq']::text[],
      null,
      array[]::text[],
      array[]::text[],
      coalesce(p_sort_order, 0),
      coalesce(p_is_published, true)
    )
    returning * into v_row;
  else
    update public.help_articles
    set
      slug = v_slug,
      title = v_title,
      category = 'faq',
      role = array[]::text[],
      locale = v_locale,
      keywords = array[]::text[],
      content = v_content,
      route_context = array['/faq']::text[],
      plan_min = null,
      module_keys = array[]::text[],
      error_codes = array[]::text[],
      sort_order = coalesce(p_sort_order, 0),
      is_published = coalesce(p_is_published, true)
    where id = p_id
      and category = 'faq'
    returning * into v_row;

    if v_row.id is null then
      raise exception 'faq_article_not_found';
    end if;
  end if;

  return v_row;
end;
$$;

grant execute on function public.admin_upsert_faq_article(uuid, text, text, text, text, integer, boolean) to authenticated, service_role;

notify pgrst, 'reload schema';
