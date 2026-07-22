alter table if exists public.demo_requests
  add column if not exists email text,
  add column if not exists company_identifier text,
  add column if not exists country_code text;

do $$
begin
  if to_regclass('public.demo_requests') is not null then
    drop policy if exists demo_requests_public_insert on public.demo_requests;
    create policy demo_requests_public_insert on public.demo_requests
      for insert to anon, authenticated
      with check (
        length(trim(full_name)) between 2 and 120
        and length(trim(phone)) between 8 and 20
        and length(trim(email)) between 5 and 254
        and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        and length(trim(company_identifier)) between 2 and 120
        and country_code = any (array['CM','CF','TD','CG','GA','GQ']::text[])
        and length(coalesce(company, '')) <= 200
        and (fleet_size is null or fleet_size between 1 and 10000)
      );
  end if;
end $$;

notify pgrst, 'reload schema';
