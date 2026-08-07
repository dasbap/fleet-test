-- Support FAQ questions and admin-managed demo request workflow.

do $$
begin
  if exists (select 1 from pg_type where typname = 'alert_type') then
    alter type public.alert_type add value if not exists 'faq_answer';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'faq_question_status') then
    create type public.faq_question_status as enum ('open', 'answered', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'demo_request_status') then
    create type public.demo_request_status as enum ('pending', 'accepted', 'refused', 'auto_accepted', 'auto_refused');
  end if;
  if not exists (select 1 from pg_type where typname = 'demo_request_auto_decision') then
    create type public.demo_request_auto_decision as enum ('accept', 'refuse');
  end if;
end $$;

create table if not exists public.faq_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_question_id uuid references public.faq_questions(id) on delete set null,
  question text not null check (length(trim(question)) between 8 and 2000),
  status public.faq_question_status not null default 'open',
  answer text,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  alert_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'answered' and answer is not null and answered_by is not null and answered_at is not null)
    or status <> 'answered'
  )
);

create index if not exists faq_questions_open_created_idx
  on public.faq_questions (created_at desc)
  where status = 'open';

create index if not exists faq_questions_user_created_idx
  on public.faq_questions (user_id, created_at desc);

alter table if exists public.alertes_automatiques
  add column if not exists recipient_user_id uuid references auth.users(id) on delete set null,
  add column if not exists faq_question_id uuid references public.faq_questions(id) on delete set null;

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text,
  phone text,
  company_identifier text,
  country_code text,
  source text,
  message text,
  status public.demo_request_status not null default 'pending',
  decision_reason text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  admin_interacted_at timestamptz,
  provisioned_user_id uuid references auth.users(id) on delete set null,
  invitation_url text,
  processed_email_queued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.demo_requests
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists company text,
  add column if not exists phone text,
  add column if not exists company_identifier text,
  add column if not exists country_code text,
  add column if not exists source text,
  add column if not exists message text,
  add column if not exists status public.demo_request_status not null default 'pending',
  add column if not exists decision_reason text,
  add column if not exists decided_by uuid references auth.users(id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists admin_interacted_at timestamptz,
  add column if not exists provisioned_user_id uuid references auth.users(id) on delete set null,
  add column if not exists invitation_url text,
  add column if not exists processed_email_queued_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists demo_requests_status_created_idx
  on public.demo_requests (status, created_at);

create table if not exists public.demo_request_settings (
  id boolean primary key default true check (id),
  auto_decision_enabled boolean not null default false,
  auto_decision public.demo_request_auto_decision not null default 'refuse',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.demo_request_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.support_current_user_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('public.admin_profiles') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and coalesce(ap.is_active, true)
  );
end;
$$;

grant execute on function public.support_current_user_is_admin() to authenticated, service_role;

create or replace function public.set_support_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists faq_questions_updated_at on public.faq_questions;
create trigger faq_questions_updated_at
  before update on public.faq_questions
  for each row execute function public.set_support_updated_at();

alter table public.faq_questions enable row level security;
alter table public.demo_request_settings enable row level security;

drop policy if exists faq_questions_insert_own on public.faq_questions;
create policy faq_questions_insert_own on public.faq_questions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'open'
    and answer is null
    and answered_by is null
  );

drop policy if exists faq_questions_read_own_or_admin on public.faq_questions;
create policy faq_questions_read_own_or_admin on public.faq_questions
  for select to authenticated
  using (auth.uid() = user_id or public.support_current_user_is_admin());

drop policy if exists faq_questions_admin_update on public.faq_questions;
create policy faq_questions_admin_update on public.faq_questions
  for update to authenticated
  using (public.support_current_user_is_admin())
  with check (public.support_current_user_is_admin());

drop policy if exists demo_request_settings_read_admin on public.demo_request_settings;
create policy demo_request_settings_read_admin on public.demo_request_settings
  for select to authenticated
  using (public.support_current_user_is_admin());

drop policy if exists demo_request_settings_update_admin on public.demo_request_settings;
create policy demo_request_settings_update_admin on public.demo_request_settings
  for update to authenticated
  using (public.support_current_user_is_admin())
  with check (public.support_current_user_is_admin());

create or replace function public.submit_faq_question(
  p_question text,
  p_parent_question_id uuid default null
)
returns public.faq_questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.faq_questions;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.faq_questions (user_id, parent_question_id, question)
  values (auth.uid(), p_parent_question_id, trim(p_question))
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_list_faq_questions(p_include_answered boolean default false)
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  parent_question_id uuid,
  question text,
  status public.faq_question_status,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    q.id,
    q.user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::text,
    q.parent_question_id,
    q.question,
    q.status,
    q.answer,
    q.answered_by,
    q.answered_at,
    q.created_at
  from public.faq_questions q
  join auth.users u on u.id = q.user_id
  where p_include_answered or q.status = 'open'
  order by q.created_at asc;
end;
$$;

create or replace function public.admin_answer_faq_question(
  p_question_id uuid,
  p_answer text
)
returns public.faq_questions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_question public.faq_questions;
  v_fleet_id uuid;
  v_alert_id uuid;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  update public.faq_questions
  set status = 'answered',
      answer = trim(p_answer),
      answered_by = auth.uid(),
      answered_at = now()
  where id = p_question_id
    and status = 'open'
  returning * into v_question;

  if v_question.id is null then
    raise exception 'question_not_found_or_already_answered';
  end if;

  select fa.fleet_id
  into v_fleet_id
  from public.flotte_adhesions fa
  where fa.user_id = v_question.user_id
  order by fa.created_at desc
  limit 1;

  if v_fleet_id is not null then
    insert into public.alertes_automatiques (
      fleet_id,
      alert_type,
      recipient_user_id,
      faq_question_id,
      severity,
      message,
      resolved,
      status
    )
    values (
      v_fleet_id,
      'faq_answer',
      v_question.user_id,
      v_question.id,
      'low',
      'Question FAQ: ' || left(v_question.question, 280) || E'\n\nReponse admin: ' || left(trim(p_answer), 700),
      false,
      'NOUVEAU'
    )
    returning id into v_alert_id;

    update public.faq_questions
    set alert_id = v_alert_id
    where id = v_question.id
    returning * into v_question;
  end if;

  return v_question;
end;
$$;

create or replace function public.admin_list_demo_requests(p_include_processed boolean default false)
returns table (
  id uuid,
  full_name text,
  email text,
  company text,
  phone text,
  company_identifier text,
  country_code text,
  status public.demo_request_status,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  provisioned_user_id uuid,
  invitation_url text,
  created_at timestamptz,
  auto_decision_enabled boolean,
  auto_decision public.demo_request_auto_decision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    dr.id,
    dr.full_name::text,
    dr.email::text,
    dr.company::text,
    dr.phone::text,
    dr.company_identifier::text,
    dr.country_code::text,
    dr.status,
    dr.decision_reason,
    dr.decided_by,
    dr.decided_at,
    dr.provisioned_user_id,
    dr.invitation_url,
    dr.created_at,
    s.auto_decision_enabled,
    s.auto_decision
  from public.demo_requests dr
  cross join public.demo_request_settings s
  where p_include_processed or dr.status = 'pending'
  order by dr.created_at asc;
end;
$$;

create or replace function public.admin_update_demo_request_auto_mode(
  p_enabled boolean,
  p_decision public.demo_request_auto_decision
)
returns public.demo_request_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.demo_request_settings;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  insert into public.demo_request_settings (id, auto_decision_enabled, auto_decision, updated_by, updated_at)
  values (true, p_enabled, p_decision, auth.uid(), now())
  on conflict (id) do update
    set auto_decision_enabled = excluded.auto_decision_enabled,
        auto_decision = excluded.auto_decision,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.admin_finalize_demo_request(
  p_request_id uuid,
  p_status public.demo_request_status,
  p_reason text default null,
  p_provisioned_user_id uuid default null,
  p_invitation_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_template text;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  if p_status not in ('accepted', 'refused', 'auto_accepted', 'auto_refused') then
    raise exception 'invalid_status';
  end if;

  update public.demo_requests
  set status = p_status,
      decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
      decided_by = auth.uid(),
      decided_at = now(),
      admin_interacted_at = coalesce(admin_interacted_at, now()),
      provisioned_user_id = p_provisioned_user_id,
      invitation_url = p_invitation_url
  where id = p_request_id
    and status = 'pending'
  returning * into v_request;

  if v_request.id is null then
    raise exception 'demo_request_not_found_or_processed';
  end if;

  if to_regclass('public.notification_queue') is not null and v_request.email is not null then
    v_template := case
      when p_status in ('accepted', 'auto_accepted') then 'demo_request_accepted'
      else 'demo_request_refused'
    end;

    insert into public.notification_queue (to_email, template_id, metadata)
    values (
      v_request.email,
      v_template,
      jsonb_build_object(
        'full_name', v_request.full_name,
        'status', p_status,
        'reason', p_reason,
        'user_id', p_provisioned_user_id,
        'invitation_url', p_invitation_url
      )
    );

    update public.demo_requests
    set processed_email_queued_at = now()
    where id = p_request_id;
  end if;

  return jsonb_build_object('ok', true, 'request_id', p_request_id, 'status', p_status);
end;
$$;

create or replace function public.admin_auto_process_demo_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.demo_request_settings;
  v_request record;
  v_count integer := 0;
  v_status public.demo_request_status;
begin
  select * into v_settings from public.demo_request_settings where id = true;

  if not coalesce(v_settings.auto_decision_enabled, false) then
    return 0;
  end if;

  v_status := case
    when v_settings.auto_decision = 'accept' then 'auto_accepted'::public.demo_request_status
    else 'auto_refused'::public.demo_request_status
  end;

  for v_request in
    select *
    from public.demo_requests
    where status = 'pending'
      and admin_interacted_at is null
      and created_at < now() - interval '48 hours'
  loop
    update public.demo_requests
    set status = v_status,
        decision_reason = 'Decision automatique apres 48h sans interaction admin',
        decided_at = now()
    where id = v_request.id;

    if to_regclass('public.notification_queue') is not null and v_request.email is not null then
      insert into public.notification_queue (to_email, template_id, metadata)
      values (
        v_request.email,
        case when v_status = 'auto_accepted' then 'demo_request_auto_accepted' else 'demo_request_auto_refused' end,
        jsonb_build_object(
          'full_name', v_request.full_name,
          'status', v_status,
          'reason', 'Decision automatique apres 48h sans interaction admin'
        )
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.submit_faq_question(text, uuid) to authenticated;
grant execute on function public.admin_list_faq_questions(boolean) to authenticated, service_role;
grant execute on function public.admin_answer_faq_question(uuid, text) to authenticated, service_role;
grant execute on function public.admin_list_demo_requests(boolean) to authenticated, service_role;
grant execute on function public.admin_update_demo_request_auto_mode(boolean, public.demo_request_auto_decision) to authenticated, service_role;
grant execute on function public.admin_finalize_demo_request(uuid, public.demo_request_status, text, uuid, text) to authenticated, service_role;
grant execute on function public.admin_auto_process_demo_requests() to authenticated, service_role;

notify pgrst, 'reload schema';
