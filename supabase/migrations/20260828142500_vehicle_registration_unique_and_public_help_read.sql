do $$
begin
  if exists (
    select 1
    from public.vehicules
    where nullif(upper(regexp_replace(trim(registration), '[^A-Za-z0-9]', '', 'g')), '') is not null
    group by upper(regexp_replace(trim(registration), '[^A-Za-z0-9]', '', 'g'))
    having count(*) > 1
  ) then
    raise notice 'Skipping vehicules_registration_normalized_unique_idx because duplicate normalized registrations exist.';
    create index if not exists vehicules_registration_normalized_idx
      on public.vehicules (
        upper(regexp_replace(trim(registration), '[^A-Za-z0-9]', '', 'g'))
      );
  else
    create unique index if not exists vehicules_registration_normalized_unique_idx
      on public.vehicules (
        upper(regexp_replace(trim(registration), '[^A-Za-z0-9]', '', 'g'))
      );
  end if;
end $$;

grant select on public.help_articles to anon, authenticated;

alter table public.help_articles enable row level security;

drop policy if exists help_articles_public_read on public.help_articles;
create policy help_articles_public_read
  on public.help_articles
  for select
  to anon, authenticated
  using (is_published = true);
