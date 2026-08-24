begin;

alter table public.demo_requests enable row level security;
alter table public.scores_conducteurs enable row level security;

drop policy if exists demo_requests_public_insert on public.demo_requests;
create policy demo_requests_public_insert
on public.demo_requests
for insert
to anon, authenticated
with check (
  status = 'pending'::public.demo_request_status
  and decision_reason is null
  and decided_by is null
  and decided_at is null
  and admin_interacted_at is null
  and provisioned_user_id is null
  and invitation_url is null
  and processed_email_queued_at is null
);

drop policy if exists scores_conducteurs_select_roles on public.scores_conducteurs;
create policy scores_conducteurs_select_roles
on public.scores_conducteurs
for select
to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
  or (
    public.has_role(fleet_id, 'driver'::public.role_type)
    and auth.uid() = driver_user_id
  )
);

commit;
