-- Inspire Match | Existing workspace reconciliation (review only)
-- No writes to companies, memberships, subscriptions or activation.
begin;
create table if not exists public.billing_sales_workspace_reconciliations (
 id uuid primary key default gen_random_uuid(),
 provisioning_id uuid not null unique references public.billing_sales_provisioning_requests(id) on delete restrict,
 candidate_company_id uuid not null references public.companies(id) on delete restrict,
 status text not null default 'proposed' check(status in ('proposed','approved_reference','rejected')),
 justification text not null default '',
 reviewer_note text not null default '',
 proposed_by uuid not null references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint billing_reconciliation_review_consistency check (
  (status='proposed' and reviewed_by is null and reviewed_at is null)
  or (status<>'proposed' and reviewed_by is not null and reviewed_at is not null)
 )
);
create index if not exists billing_sales_workspace_reconciliations_company_idx
 on public.billing_sales_workspace_reconciliations(candidate_company_id);
alter table public.billing_sales_workspace_reconciliations enable row level security;
revoke all on public.billing_sales_workspace_reconciliations from public,anon,authenticated;
grant select on public.billing_sales_workspace_reconciliations to authenticated;
create policy billing_sales_workspace_reconciliations_read
 on public.billing_sales_workspace_reconciliations for select to authenticated
 using(public.billing_is_internal_staff());

create table if not exists public.billing_sales_workspace_reconciliation_events(
 id uuid primary key default gen_random_uuid(),
 reconciliation_id uuid not null references public.billing_sales_workspace_reconciliations(id) on delete restrict,
 action text not null check(action in ('proposed','approved_reference','rejected')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 created_at timestamptz not null default now()
);
alter table public.billing_sales_workspace_reconciliation_events enable row level security;
revoke all on public.billing_sales_workspace_reconciliation_events from public,anon,authenticated;
grant select on public.billing_sales_workspace_reconciliation_events to authenticated;
create policy billing_sales_workspace_reconciliation_events_read
 on public.billing_sales_workspace_reconciliation_events for select to authenticated
 using(public.billing_is_internal_staff());

create or replace function public.billing_sales_propose_workspace_reference(
 p_provisioning_id uuid,p_company_id uuid,p_justification text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.billing_sales_can_manage() then
  raise exception 'Internal Sales authorization required' using errcode='42501';
 end if;
 if length(btrim(coalesce(p_justification,'')))<12 then
  raise exception 'Explain why this existing workspace belongs to this client (12+ characters)';
 end if;
 if not exists(
  select 1 from public.billing_sales_provisioning_requests r
  join public.billing_sales_onboardings o on o.id=r.onboarding_id
  join public.billing_sales_contracts c on c.id=o.contract_id
  join public.billing_sales_proposals p on p.id=c.proposal_id
  where r.id=p_provisioning_id and r.status='approved_for_manual_setup'
    and r.activation_gate='blocked' and r.linked_company_id is null
    and o.status='approved_for_provisioning'
    and c.status='signed' and p.status='approved'
 ) then raise exception 'Provisioning must be independently approved with a signed contract'; end if;
 if not exists(select 1 from public.companies where id=p_company_id) then
  raise exception 'Workspace does not exist';
 end if;
 if exists(select 1 from public.billing_sales_workspace_reconciliations
  where candidate_company_id=p_company_id and status='approved_reference') then
  raise exception 'Workspace already has an approved reference';
 end if;
 insert into public.billing_sales_workspace_reconciliations(
  provisioning_id,candidate_company_id,justification,proposed_by
 ) values(p_provisioning_id,p_company_id,left(btrim(p_justification),3000),auth.uid())
 returning id into v_id;
 insert into public.billing_sales_workspace_reconciliation_events(
  reconciliation_id,action,actor_id,comment
 ) values(v_id,'proposed',auth.uid(),left(btrim(p_justification),3000));
 return pg_catalog.jsonb_build_object('id',v_id,'status','proposed','activation','blocked');
end;
$$;
revoke all on function public.billing_sales_propose_workspace_reference(uuid,uuid,text) from public,anon;
grant execute on function public.billing_sales_propose_workspace_reference(uuid,uuid,text) to authenticated;

create or replace function public.billing_sales_review_workspace_reference(
 p_reconciliation_id uuid,p_approve boolean,p_comment text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_workspace_reconciliations%rowtype;
declare v_status text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.billing_internal_staff
  where user_id=auth.uid() and is_active and staff_role='platform_admin'
 ) then raise exception 'Platform Admin required' using errcode='42501'; end if;
 select * into v from public.billing_sales_workspace_reconciliations
 where id=p_reconciliation_id for update;
 if not found then raise exception 'Reference not found'; end if;
 if v.status<>'proposed' then raise exception 'Reference has already been reviewed'; end if;
 if v.proposed_by=auth.uid() then
  raise exception 'Independent reviewer required' using errcode='42501';
 end if;
 if not p_approve and length(btrim(coalesce(p_comment,'')))<3 then
  raise exception 'Rejection reason required';
 end if;
 if p_approve and exists(
  select 1 from public.billing_sales_workspace_reconciliations
  where candidate_company_id=v.candidate_company_id
    and status='approved_reference' and id<>v.id
 ) then raise exception 'Workspace already approved for another reference'; end if;
 if p_approve and not exists(
  select 1 from public.billing_sales_provisioning_requests r
  where r.id=v.provisioning_id and r.status='approved_for_manual_setup'
    and r.activation_gate='blocked' and r.linked_company_id is null
 ) then raise exception 'Provisioning no longer eligible'; end if;
 v_status:=case when p_approve then 'approved_reference' else 'rejected' end;
 update public.billing_sales_workspace_reconciliations
 set status=v_status,reviewer_note=left(btrim(coalesce(p_comment,'')),3000),
  reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
 where id=v.id;
 insert into public.billing_sales_workspace_reconciliation_events(
  reconciliation_id,action,actor_id,comment
 ) values(v.id,v_status,auth.uid(),left(btrim(coalesce(p_comment,'')),3000));
 return pg_catalog.jsonb_build_object('id',v.id,'status',v_status,
  'actual_company_link_created',false,'activation','blocked');
end;
$$;
revoke all on function public.billing_sales_review_workspace_reference(uuid,boolean,text) from public,anon;
grant execute on function public.billing_sales_review_workspace_reference(uuid,boolean,text) to authenticated;
-- This migration stores a reviewed REFERENCE only. It does not set linked_company_id.
-- An audited service-side linkage and tenant access audit must precede actual setup.
commit;
