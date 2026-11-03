-- Inspire Match ATS | Private, contract-linked client onboarding.
-- Apply after saas_sales_contracts_foundation.sql and saas_sales_contracts_review.sql.
-- No company creation, invitations, subscription activation, billing or payments.
begin;

create table if not exists public.billing_sales_onboardings (
 id uuid primary key default gen_random_uuid(),
 contract_id uuid not null unique references public.billing_sales_contracts(id) on delete restrict,
 status text not null default 'draft'
  check(status in ('draft','submitted_for_review','approved_for_provisioning')),
 workspace_name text not null default '',
 country text not null default '',
 timezone text not null default 'Africa/Cairo',
 primary_contact_name text not null default '',
 primary_contact_email text not null default '',
 primary_contact_phone text not null default '',
 admin_email text not null default '',
 implementation_notes text not null default '',
 contract_file_checked boolean not null default false,
 company_details_checked boolean not null default false,
 admin_contact_checked boolean not null default false,
 security_requirements_checked boolean not null default false,
 kickoff_checked boolean not null default false,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint billing_sales_onboardings_name_length check(length(workspace_name)<=200),
 constraint billing_sales_onboardings_email_limits check(length(admin_email)<=254 and length(primary_contact_email)<=254),
 constraint billing_sales_onboardings_status_review check (
   (status='approved_for_provisioning' and reviewed_by is not null and reviewed_at is not null)
   or (status<>'approved_for_provisioning' and reviewed_by is null and reviewed_at is null))
);
create index if not exists billing_sales_onboardings_status_idx
 on public.billing_sales_onboardings(status,updated_at desc);
alter table public.billing_sales_onboardings enable row level security;
revoke all on public.billing_sales_onboardings from public,anon,authenticated;
grant select on public.billing_sales_onboardings to authenticated;
grant insert (
 contract_id,workspace_name,country,timezone,primary_contact_name,primary_contact_email,
 primary_contact_phone,admin_email,implementation_notes,
 contract_file_checked,company_details_checked,admin_contact_checked,
 security_requirements_checked,kickoff_checked,created_by,updated_by
) on public.billing_sales_onboardings to authenticated;
grant update (
 workspace_name,country,timezone,primary_contact_name,primary_contact_email,
 primary_contact_phone,admin_email,implementation_notes,
 contract_file_checked,company_details_checked,admin_contact_checked,
 security_requirements_checked,kickoff_checked,updated_by
) on public.billing_sales_onboardings to authenticated;

drop policy if exists billing_sales_onboardings_internal_read on public.billing_sales_onboardings;
create policy billing_sales_onboardings_internal_read
 on public.billing_sales_onboardings for select to authenticated
 using(public.billing_is_internal_staff());
drop policy if exists billing_sales_onboardings_sales_insert on public.billing_sales_onboardings;
create policy billing_sales_onboardings_sales_insert
 on public.billing_sales_onboardings for insert to authenticated
 with check (
  public.billing_sales_can_manage() and status='draft'
  and created_by=auth.uid() and updated_by=auth.uid()
  and exists (
    select 1 from public.billing_sales_contracts c
    join public.billing_sales_proposals p on p.id=c.proposal_id
    where c.id=contract_id and c.status='signed' and p.status='approved'
  )
 );
drop policy if exists billing_sales_onboardings_sales_update on public.billing_sales_onboardings;
create policy billing_sales_onboardings_sales_update
 on public.billing_sales_onboardings for update to authenticated
 using(public.billing_sales_can_manage() and status='draft')
 with check(public.billing_sales_can_manage() and status='draft' and updated_by=auth.uid());

create or replace function public.billing_sales_onboarding_touch()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' and (
    new.id is distinct from old.id
    or new.contract_id is distinct from old.contract_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
 ) then
  raise exception 'Onboarding identity fields are immutable';
 end if;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.billing_sales_onboarding_touch() from public,anon,authenticated;
drop trigger if exists billing_sales_onboarding_touch_trigger on public.billing_sales_onboardings;
create trigger billing_sales_onboarding_touch_trigger before update
 on public.billing_sales_onboardings for each row
 execute function public.billing_sales_onboarding_touch();

create table if not exists public.billing_sales_onboarding_events (
 id uuid primary key default gen_random_uuid(),
 onboarding_id uuid not null references public.billing_sales_onboardings(id) on delete restrict,
 action text not null check(action in ('submitted','approved','request_changes')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_sales_onboarding_events_idx
 on public.billing_sales_onboarding_events(onboarding_id,created_at desc);
alter table public.billing_sales_onboarding_events enable row level security;
revoke all on public.billing_sales_onboarding_events from public,anon,authenticated;
grant select on public.billing_sales_onboarding_events to authenticated;
drop policy if exists billing_sales_onboarding_events_read on public.billing_sales_onboarding_events;
create policy billing_sales_onboarding_events_read on public.billing_sales_onboarding_events
 for select to authenticated using(public.billing_is_internal_staff());

create or replace function public.billing_sales_submit_onboarding(p_onboarding_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v public.billing_sales_onboardings%rowtype;
begin
 if auth.uid() is null or not public.billing_sales_can_manage() then
  raise exception 'Internal Sales permission required' using errcode='42501';
 end if;
 select * into v from public.billing_sales_onboardings where id=p_onboarding_id for update;
 if not found then raise exception 'Onboarding record not found'; end if;
 if v.status<>'draft' then raise exception 'Only onboarding drafts can be submitted'; end if;
 if not exists (
  select 1 from public.billing_sales_contracts c
  join public.billing_sales_proposals p on p.id=c.proposal_id
  where c.id=v.contract_id and c.status='signed' and p.status='approved'
 ) then
  raise exception 'An approved proposal and signed contract are required';
 end if;
 if length(btrim(v.workspace_name))<2
  or length(btrim(v.country))<2
  or length(btrim(v.primary_contact_name))<2
  or v.primary_contact_email !~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
  or v.admin_email !~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'
  or not (v.contract_file_checked and v.company_details_checked and v.admin_contact_checked
  and v.security_requirements_checked and v.kickoff_checked) then
  raise exception 'Complete company details, valid contact emails and all onboarding checks first';
 end if;
 update public.billing_sales_onboardings
 set status='submitted_for_review',updated_by=auth.uid()
 where id=p_onboarding_id;
 insert into public.billing_sales_onboarding_events(onboarding_id,action,actor_id)
 values(p_onboarding_id,'submitted',auth.uid());
 return pg_catalog.jsonb_build_object('id',p_onboarding_id,'status','submitted_for_review');
end;
$$;
revoke all on function public.billing_sales_submit_onboarding(uuid) from public,anon;
grant execute on function public.billing_sales_submit_onboarding(uuid) to authenticated;

create or replace function public.billing_sales_review_onboarding(
 p_onboarding_id uuid,p_decision text,p_comment text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v public.billing_sales_onboardings%rowtype;
 v_comment text:=btrim(coalesce(p_comment,''));
 v_status text;
begin
 if auth.uid() is null or not exists(
   select 1 from public.billing_internal_staff s
   where s.user_id=auth.uid() and s.is_active and s.staff_role='platform_admin'
 ) then
  raise exception 'Platform Admin approval required' using errcode='42501';
 end if;
 if p_decision not in ('approve','request_changes') then
  raise exception 'Unknown onboarding decision';
 end if;
 if p_decision='request_changes' and length(v_comment)<3 then
  raise exception 'Add a reason for the requested changes';
 end if;
 select * into v from public.billing_sales_onboardings where id=p_onboarding_id for update;
 if not found then raise exception 'Onboarding record not found'; end if;
 if v.status<>'submitted_for_review' then raise exception 'Onboarding is not awaiting review'; end if;
 if v.created_by=auth.uid() or v.updated_by=auth.uid() then
  raise exception 'Independent reviewer required: you cannot approve or review your own submission'
   using errcode='42501';
 end if;
 if p_decision='approve' and not exists(
  select 1 from public.billing_sales_contracts c
  join public.billing_sales_proposals p on p.id=c.proposal_id
  where c.id=v.contract_id and c.status='signed' and p.status='approved'
 ) then raise exception 'Contract/proposal must still be signed and approved'; end if;
 v_status:=case when p_decision='approve' then 'approved_for_provisioning' else 'draft' end;
 update public.billing_sales_onboardings
 set status=v_status,
  reviewed_by=case when p_decision='approve' then auth.uid() else null end,
  reviewed_at=case when p_decision='approve' then now() else null end
 where id=p_onboarding_id;
 insert into public.billing_sales_onboarding_events(onboarding_id,action,actor_id,comment)
 values(p_onboarding_id,case when p_decision='approve' then 'approved' else 'request_changes' end,
  auth.uid(),left(v_comment,3000));
 return pg_catalog.jsonb_build_object('id',p_onboarding_id,'status',v_status);
end;
$$;
revoke all on function public.billing_sales_review_onboarding(uuid,text,text) from public,anon;
grant execute on function public.billing_sales_review_onboarding(uuid,text,text) to authenticated;

-- APPROVED_FOR_PROVISIONING is an internal clearance only. No company or auth user
-- is created, no invitations sent, no subscription activated, no payments collected.
commit;
