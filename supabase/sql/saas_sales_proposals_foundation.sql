-- Inspire Match | Private Sales proposals (no checkout, invoicing or activation)
-- Apply after saas_sales_leads_crm.sql and saas_billing_private_sales_split.sql.
begin;
create table if not exists public.billing_sales_proposals (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.billing_sales_leads(id) on delete restrict,
 reference text not null unique default ('IM-P-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 title text not null check (length(btrim(title)) between 2 and 200),
 currency text not null check (currency in ('EGP','SAR','AED','USD')),
 setup_fee_minor bigint check (setup_fee_minor is null or setup_fee_minor >= 0),
 recurring_fee_minor bigint check (recurring_fee_minor is null or recurring_fee_minor >= 0),
 billing_interval text not null default 'month' check (billing_interval in ('month','year')),
 status text not null default 'draft' check (status in ('draft','internal_review','approved','sent','accepted','declined','expired')),
 scope_notes text not null default '',
 internal_notes text not null default '',
 valid_until date,
 created_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint proposal_review_required check (status not in ('approved','sent','accepted') or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists billing_sales_proposals_lead_idx on public.billing_sales_proposals(lead_id,created_at desc);
alter table public.billing_sales_proposals enable row level security;
revoke all on public.billing_sales_proposals from public,anon,authenticated;
grant select on public.billing_sales_proposals to authenticated;
grant insert (lead_id,title,currency,setup_fee_minor,recurring_fee_minor,billing_interval,status,scope_notes,internal_notes,valid_until,created_by,updated_by)
 on public.billing_sales_proposals to authenticated;
grant update (title,currency,setup_fee_minor,recurring_fee_minor,billing_interval,status,scope_notes,internal_notes,valid_until,updated_by)
 on public.billing_sales_proposals to authenticated;
drop policy if exists billing_sales_proposals_read on public.billing_sales_proposals;
create policy billing_sales_proposals_read on public.billing_sales_proposals for select to authenticated
 using (public.billing_is_internal_staff());
drop policy if exists billing_sales_proposals_insert on public.billing_sales_proposals;
create policy billing_sales_proposals_insert on public.billing_sales_proposals for insert to authenticated
 with check (public.billing_sales_can_manage() and created_by=auth.uid() and updated_by=auth.uid() and status='draft');
drop policy if exists billing_sales_proposals_update on public.billing_sales_proposals;
create policy billing_sales_proposals_update on public.billing_sales_proposals for update to authenticated
 using (public.billing_sales_can_manage() and status in ('draft','internal_review'))
 with check (public.billing_sales_can_manage() and updated_by=auth.uid() and status in ('draft','internal_review'));
create or replace function public.billing_sales_proposal_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' then
  if new.lead_id is distinct from old.lead_id or new.created_by is distinct from old.created_by
     or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at
     or new.reference is distinct from old.reference then
   raise exception 'Proposal identity and review fields are immutable through client updates';
  end if;
 end if;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.billing_sales_proposal_guard() from public,anon,authenticated;
drop trigger if exists billing_sales_proposal_guard_trigger on public.billing_sales_proposals;
create trigger billing_sales_proposal_guard_trigger before update on public.billing_sales_proposals
for each row execute function public.billing_sales_proposal_guard();
-- Approval and delivery intentionally require a separate audited, finance-authorized RPC.
commit;