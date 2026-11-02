-- Inspire Match | Audited internal proposal review
-- Requires saas_sales_proposals_foundation.sql. No customer delivery or billing.
begin;
create table if not exists public.billing_sales_proposal_review_events(
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null references public.billing_sales_proposals(id) on delete restrict,
 action text not null check(action in ('submit','approve','request_changes')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_sales_proposal_review_events_idx
 on public.billing_sales_proposal_review_events(proposal_id,created_at desc);
alter table public.billing_sales_proposal_review_events enable row level security;
revoke all on public.billing_sales_proposal_review_events from public,anon,authenticated;
grant select on public.billing_sales_proposal_review_events to authenticated;
drop policy if exists billing_sales_proposal_events_internal_read on public.billing_sales_proposal_review_events;
create policy billing_sales_proposal_events_internal_read
 on public.billing_sales_proposal_review_events for select to authenticated
 using (public.billing_is_internal_staff());

-- Client edits must never move status or alter review metadata.
create or replace function public.billing_sales_proposal_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' then
  if new.lead_id is distinct from old.lead_id or new.created_by is distinct from old.created_by
     or new.reference is distinct from old.reference then
   raise exception 'Proposal identity fields are immutable';
  end if;
  if coalesce(current_setting('app.proposal_review_rpc',true),'') <> 'authorized' then
   if new.status is distinct from old.status or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'Proposal review changes require the internal approval workflow';
   end if;
  end if;
 end if;
 new.updated_at=now();
 return new;
end;
$$;

-- A submitted proposal is frozen. Only drafts may be edited directly.
drop policy if exists billing_sales_proposals_update on public.billing_sales_proposals;
create policy billing_sales_proposals_update on public.billing_sales_proposals
 for update to authenticated
 using (public.billing_sales_can_manage() and status='draft')
 with check (public.billing_sales_can_manage() and updated_by=auth.uid() and status='draft');

create or replace function public.billing_sales_submit_proposal(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_proposals%rowtype;
begin
 if auth.uid() is null or not public.billing_sales_can_manage() then
  raise exception 'Sales or Platform Admin permission required' using errcode='42501';
 end if;
 select * into v from public.billing_sales_proposals where id=p_proposal_id for update;
 if not found then raise exception 'Proposal not found'; end if;
 if v.status <> 'draft' then raise exception 'Only drafts can be submitted'; end if;
 if v.setup_fee_minor is null or v.recurring_fee_minor is null then
  raise exception 'Complete setup and recurring fees before submission';
 end if;
 perform set_config('app.proposal_review_rpc','authorized',true);
 update public.billing_sales_proposals set status='internal_review',updated_by=auth.uid()
 where id=p_proposal_id;
 insert into public.billing_sales_proposal_review_events(proposal_id,action,actor_id)
 values(p_proposal_id,'submit',auth.uid());
 return jsonb_build_object('id',p_proposal_id,'status','internal_review');
end;
$$;
revoke all on function public.billing_sales_submit_proposal(uuid) from public,anon;
grant execute on function public.billing_sales_submit_proposal(uuid) to authenticated;

create or replace function public.billing_sales_review_proposal(
 p_proposal_id uuid,p_decision text,p_comment text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_proposals%rowtype; v_role text; v_finance boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select s.staff_role into v_role from public.billing_internal_staff s
 where s.user_id=auth.uid() and s.is_active;
 select exists(select 1 from public.billing_finance_reviewers r
  where r.user_id=auth.uid() and r.is_active) into v_finance;
 if not (v_role in ('finance','platform_admin') or v_finance) then
  raise exception 'Finance reviewer permission required' using errcode='42501';
 end if;
 if p_decision not in ('approve','request_changes') then raise exception 'Invalid review decision'; end if;
 if p_decision='request_changes' and length(btrim(coalesce(p_comment,'')))<3 then
  raise exception 'A reason is required when requesting changes';
 end if;
 select * into v from public.billing_sales_proposals where id=p_proposal_id for update;
 if not found then raise exception 'Proposal not found'; end if;
 if v.status <> 'internal_review' then raise exception 'Proposal is not awaiting review'; end if;
 if v.created_by=auth.uid() or v.updated_by=auth.uid() then
  raise exception 'You cannot review a proposal you created or submitted' using errcode='42501';
 end if;
 perform set_config('app.proposal_review_rpc','authorized',true);
 update public.billing_sales_proposals set
  status=case when p_decision='approve' then 'approved' else 'draft' end,
  reviewed_by=case when p_decision='approve' then auth.uid() else null end,
  reviewed_at=case when p_decision='approve' then now() else null end
 where id=p_proposal_id;
 insert into public.billing_sales_proposal_review_events(proposal_id,action,actor_id,comment)
 values(p_proposal_id,p_decision,auth.uid(),left(coalesce(p_comment,''),3000));
 return jsonb_build_object('id',p_proposal_id,'status',
  case when p_decision='approve' then 'approved' else 'draft' end);
end;
$$;
revoke all on function public.billing_sales_review_proposal(uuid,text,text) from public,anon;
grant execute on function public.billing_sales_review_proposal(uuid,text,text) to authenticated;
commit;