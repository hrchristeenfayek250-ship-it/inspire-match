-- Inspire Match | Private sales contracts and controlled onboarding
-- Apply after saas_sales_proposals_review.sql. No signing, invoicing or activation.
begin;
create table if not exists public.billing_sales_contracts(
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null unique references public.billing_sales_proposals(id) on delete restrict,
 contract_reference text not null unique default ('IM-C-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 status text not null default 'draft' check(status in ('draft','legal_review','ready_for_signature','signed','cancelled')),
 legal_entity_name text not null default '',
 contract_notes text not null default '',
 effective_date date,
 expiry_date date,
 signed_at timestamptz,
 signed_document_reference text not null default '',
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint signed_contract_complete check(status<>'signed' or
   (signed_at is not null and length(btrim(signed_document_reference))>0)),
 constraint contract_dates_order check(expiry_date is null or effective_date is null or expiry_date>=effective_date)
);
create index if not exists billing_sales_contracts_status_idx on public.billing_sales_contracts(status);
alter table public.billing_sales_contracts enable row level security;
revoke all on public.billing_sales_contracts from public,anon,authenticated;
grant select on public.billing_sales_contracts to authenticated;
grant insert(proposal_id,legal_entity_name,contract_notes,effective_date,expiry_date,created_by,updated_by)
 on public.billing_sales_contracts to authenticated;
grant update(legal_entity_name,contract_notes,effective_date,expiry_date,updated_by)
 on public.billing_sales_contracts to authenticated;
drop policy if exists billing_sales_contracts_internal_read on public.billing_sales_contracts;
create policy billing_sales_contracts_internal_read on public.billing_sales_contracts for select to authenticated
 using(public.billing_is_internal_staff());
drop policy if exists billing_sales_contracts_create on public.billing_sales_contracts;
create policy billing_sales_contracts_create on public.billing_sales_contracts for insert to authenticated
 with check(public.billing_sales_can_manage() and created_by=auth.uid() and updated_by=auth.uid()
 and exists(select 1 from public.billing_sales_proposals p where p.id=proposal_id and p.status='approved'));
drop policy if exists billing_sales_contracts_edit on public.billing_sales_contracts;
create policy billing_sales_contracts_edit on public.billing_sales_contracts for update to authenticated
 using(public.billing_sales_can_manage() and status='draft')
 with check(public.billing_sales_can_manage() and status='draft' and updated_by=auth.uid());
create or replace function public.billing_sales_contract_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.proposal_id is distinct from old.proposal_id
   or new.contract_reference is distinct from old.contract_reference
   or new.created_by is distinct from old.created_by
   or new.status is distinct from old.status
   or new.signed_at is distinct from old.signed_at
   or new.signed_document_reference is distinct from old.signed_document_reference then
   raise exception 'Contract identity, signature and workflow state require a controlled process';
  end if;
 end if;
 new.updated_at=now();
 return new;
end;
$$;
revoke all on function public.billing_sales_contract_guard() from public,anon,authenticated;
drop trigger if exists billing_sales_contract_guard_trigger on public.billing_sales_contracts;
create trigger billing_sales_contract_guard_trigger before update on public.billing_sales_contracts
for each row execute function public.billing_sales_contract_guard();
-- This table is internal contract preparation only. No automated signature or activation.
commit;