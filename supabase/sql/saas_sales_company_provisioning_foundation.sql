-- Inspire Match | Controlled preparation of client workspaces
-- Requires saas_sales_client_onboarding_foundation.sql
-- This migration DOES NOT create companies, users, invitations or subscriptions.
-- Billing and ATS access enforcement are deliberately unchanged.
begin;

create table if not exists public.billing_sales_provisioning_requests (
 id uuid primary key default gen_random_uuid(),
 onboarding_id uuid not null unique references public.billing_sales_onboardings(id) on delete restrict,
 status text not null default 'draft'
   check(status in ('draft','submitted_for_review','approved_for_manual_setup')),
 workspace_name text not null default '',
 proposed_admin_email text not null default '',
 country text not null default '',
 timezone text not null default 'Africa/Cairo',
 implementation_owner_id uuid not null references auth.users(id),
 handover_notes text not null default '',
 signed_contract_verified boolean not null default false,
 admin_identity_verified boolean not null default false,
 security_scope_confirmed boolean not null default false,
 tenant_isolation_reviewed boolean not null default false,
 -- Later backend-only provisioning may link a tenant once separately authorized.
 linked_company_id uuid unique references public.companies(id) on delete restrict,
 -- Keep commercial access explicitly blocked; no UI or RPC below can edit this.
 activation_gate text not null default 'blocked' check(activation_gate='blocked'),
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint billing_provisioning_review_consistency check (
   (status='approved_for_manual_setup' and reviewed_by is not null and reviewed_at is not null)
    or (status<>'approved_for_manual_setup' and reviewed_by is null and reviewed_at is null)),
 constraint billing_provisioning_lengths check (
   length(workspace_name)<=200 and length(proposed_admin_email)<=254
   and length(handover_notes)<=8000)
);
create index if not exists billing_sales_provisioning_status_idx
 on public.billing_sales_provisioning_requests(status,updated_at desc);

alter table public.billing_sales_provisioning_requests enable row level security;
revoke all on public.billing_sales_provisioning_requests from public,anon,authenticated;
grant select on public.billing_sales_provisioning_requests to authenticated;
grant insert(
 onboarding_id,workspace_name,proposed_admin_email,country,timezone,
 implementation_owner_id,handover_notes,signed_contract_verified,
 admin_identity_verified,security_scope_confirmed,tenant_isolation_reviewed,
 created_by,updated_by
) on public.billing_sales_provisioning_requests to authenticated;
grant update(
 workspace_name,proposed_admin_email,country,timezone,handover_notes,
 signed_contract_verified,admin_identity_verified,security_scope_confirmed,
 tenant_isolation_reviewed,updated_by
) on public.billing_sales_provisioning_requests to authenticated;

drop policy if exists billing_sales_provisioning_internal_read on public.billing_sales_provisioning_requests;
create policy billing_sales_provisioning_internal_read
 on public.billing_sales_provisioning_requests for select to authenticated
 using(public.billing_is_internal_staff());

drop policy if exists billing_sales_provisioning_create on public.billing_sales_provisioning_requests;
create policy billing_sales_provisioning_create
 on public.billing_sales_provisioning_requests for insert to authenticated
 with check(
  public.billing_sales_can_manage() and status='draft'
  and created_by=auth.uid() and updated_by=auth.uid()
  and implementation_owner_id=auth.uid()
  and linked_company_id is null and activation_gate='blocked'
  and exists(
   select 1 from public.billing_sales_onboardings o
   join public.billing_sales_contracts c on c.id=o.contract_id
   join public.billing_sales_proposals p on p.id=c.proposal_id
   where o.id=onboarding_id and o.status='approved_for_provisioning'
    and c.status='signed' and p.status='approved'
  )
 );

drop policy if exists billing_sales_provisioning_draft_edit on public.billing_sales_provisioning_requests;
create policy billing_sales_provisioning_draft_edit
 on public.billing_sales_provisioning_requests for update to authenticated
 using(public.billing_sales_can_manage() and status='draft')
 with check(public.billing_sales_can_manage() and status='draft'
  and updated_by=auth.uid() and activation_gate='blocked');

create or replace function public.billing_sales_provisioning_touch()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' and (
  new.id is distinct from old.id
  or new.onboarding_id is distinct from old.onboarding_id
  or new.created_by is distinct from old.created_by
  or new.created_at is distinct from old.created_at
  or new.implementation_owner_id is distinct from old.implementation_owner_id
  or new.activation_gate is distinct from old.activation_gate
  or new.linked_company_id is distinct from old.linked_company_id
 ) then raise exception 'Provisioning identity, owner and activation gate are protected'; end if;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.billing_sales_provisioning_touch() from public,anon,authenticated;
drop trigger if exists billing_sales_provisioning_touch_trigger on public.billing_sales_provisioning_requests;
create trigger billing_sales_provisioning_touch_trigger
 before update on public.billing_sales_provisioning_requests
 for each row execute function public.billing_sales_provisioning_touch();

create table if not exists public.billing_sales_provisioning_events(
 id uuid primary key default gen_random_uuid(),
 provisioning_id uuid not null references public.billing_sales_provisioning_requests(id) on delete restrict,
 action text not null check(action in ('submitted','approved_for_manual_setup','request_changes')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_sales_provisioning_events_idx
 on public.billing_sales_provisioning_events(provisioning_id,created_at desc);
alter table public.billing_sales_provisioning_events enable row level security;
revoke all on public.billing_sales_provisioning_events from public,anon,authenticated;
grant select on public.billing_sales_provisioning_events to authenticated;
drop policy if exists billing_sales_provisioning_events_read on public.billing_sales_provisioning_events;
create policy billing_sales_provisioning_events_read
 on public.billing_sales_provisioning_events for select to authenticated
 using(public.billing_is_internal_staff());

create or replace function public.billing_sales_submit_provisioning(p_provisioning_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_provisioning_requests%rowtype;
begin
 if auth.uid() is null or not public.billing_sales_can_manage() then
  raise exception 'Internal Sales or Platform Admin required' using errcode='42501';
 end if;
 select * into v from public.billing_sales_provisioning_requests
 where id=p_provisioning_id for update;
 if not found then raise exception 'Provisioning request not found'; end if;
 if v.status<>'draft' then raise exception 'Only drafts can be submitted'; end if;
 if not exists(
   select 1 from public.billing_sales_onboardings o
   join public.billing_sales_contracts c on c.id=o.contract_id
   join public.billing_sales_proposals p on p.id=c.proposal_id
   where o.id=v.onboarding_id and o.status='approved_for_provisioning'
     and c.status='signed' and p.status='approved'
 ) then raise exception 'Approved onboarding, signed contract and approved proposal are required'; end if;
 if length(btrim(v.workspace_name))<2 or length(btrim(v.country))<2
   or v.proposed_admin_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
   or not(v.signed_contract_verified and v.admin_identity_verified
    and v.security_scope_confirmed and v.tenant_isolation_reviewed) then
  raise exception 'Complete the workspace details, admin email and all readiness checks';
 end if;
 if not exists(select 1 from public.billing_internal_staff s
   where s.user_id=v.implementation_owner_id and s.is_active) then
   raise exception 'Implementation owner must be active internal staff';
 end if;
 if v.linked_company_id is not null or v.activation_gate<>'blocked' then
  raise exception 'Provisioning activation gate must remain blocked';
 end if;
 update public.billing_sales_provisioning_requests
  set status='submitted_for_review',updated_by=auth.uid(),submitted_at=now()
  where id=v.id;
 insert into public.billing_sales_provisioning_events(provisioning_id,action,actor_id)
 values(v.id,'submitted',auth.uid());
 return pg_catalog.jsonb_build_object('id',v.id,'status','submitted_for_review');
end;
$$;
revoke all on function public.billing_sales_submit_provisioning(uuid) from public,anon;
grant execute on function public.billing_sales_submit_provisioning(uuid) to authenticated;

create or replace function public.billing_sales_review_provisioning(
 p_provisioning_id uuid,p_decision text,p_comment text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v public.billing_sales_provisioning_requests%rowtype;
 v_status text;
 v_comment text:=btrim(coalesce(p_comment,''));
begin
 if auth.uid() is null or not exists(
  select 1 from public.billing_internal_staff s
  where s.user_id=auth.uid() and s.is_active and s.staff_role='platform_admin'
 ) then raise exception 'Platform Admin required' using errcode='42501'; end if;
 if p_decision not in ('approve','request_changes') then raise exception 'Invalid review action'; end if;
 if p_decision='request_changes' and length(v_comment)<3 then
   raise exception 'Reason for changes is required';
 end if;
 select * into v from public.billing_sales_provisioning_requests
 where id=p_provisioning_id for update;
 if not found then raise exception 'Provisioning request not found'; end if;
 if v.status<>'submitted_for_review' then raise exception 'Not awaiting review'; end if;
 if v.created_by=auth.uid() or v.updated_by=auth.uid() then
  raise exception 'Independent reviewer required' using errcode='42501';
 end if;
 if p_decision='approve' and not exists(
   select 1 from public.billing_sales_onboardings o
   join public.billing_sales_contracts c on c.id=o.contract_id
   join public.billing_sales_proposals p on p.id=c.proposal_id
   where o.id=v.onboarding_id and o.status='approved_for_provisioning'
    and c.status='signed' and p.status='approved'
 ) then raise exception 'Underlying onboarding / agreement is no longer approved'; end if;
 if v.linked_company_id is not null or v.activation_gate<>'blocked' then
  raise exception 'Unexpected workspace linkage or activation state';
 end if;
 v_status:=case when p_decision='approve' then 'approved_for_manual_setup' else 'draft' end;
 update public.billing_sales_provisioning_requests
 set status=v_status,
  reviewed_by=case when p_decision='approve' then auth.uid() else null end,
  reviewed_at=case when p_decision='approve' then now() else null end
 where id=v.id;
 insert into public.billing_sales_provisioning_events(provisioning_id,action,actor_id,comment)
 values(v.id,case when p_decision='approve' then 'approved_for_manual_setup' else 'request_changes' end,
 auth.uid(),left(v_comment,3000));
 return pg_catalog.jsonb_build_object('id',v.id,'status',v_status,'activation_gate','blocked');
end;
$$;
revoke all on function public.billing_sales_review_provisioning(uuid,text,text) from public,anon;
grant execute on function public.billing_sales_review_provisioning(uuid,text,text) to authenticated;
-- No RPC here performs provisioning, links existing tenants, invites users, changes
-- billing_company_activation, or creates subscriptions. This is an internal work queue.
commit;
