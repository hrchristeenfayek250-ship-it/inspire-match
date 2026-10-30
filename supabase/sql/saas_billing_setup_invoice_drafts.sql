-- Inspire Match ATS | One-time setup fee invoice drafts (phase 1)
-- Run AFTER billing_currency_usd.sql. Does not initiate payment or issue tax invoices.
-- A company has at most one setup-fee record. Customer admins may prepare a draft only.
begin;

create table if not exists public.billing_setup_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  commercial_offer_id uuid not null references public.billing_commercial_offers(id),
  plan_id text not null references public.billing_plans(id),
  currency text not null check(currency in ('EGP','SAR','AED','USD')),
  billing_interval text not null check(billing_interval in ('month','year')),
  amount_minor bigint not null check(amount_minor > 0),
  status text not null default 'draft'
    check(status in ('draft','issued','paid','void','refunded')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  paid_at timestamptz
);

create index if not exists billing_setup_invoice_offer_idx
on public.billing_setup_invoices(commercial_offer_id);

alter table public.billing_setup_invoices enable row level security;
revoke all on public.billing_setup_invoices from anon;
grant select on public.billing_setup_invoices to authenticated;

drop policy if exists billing_setup_invoices_admin_read on public.billing_setup_invoices;
create policy billing_setup_invoices_admin_read
on public.billing_setup_invoices for select to authenticated
using (exists(
 select 1 from public.company_members m
 where m.company_id=billing_setup_invoices.company_id
 and m.user_id=auth.uid() and m.role='admin'
));
-- No client INSERT/UPDATE/DELETE policies. RPC is the only draft writer.

create or replace function public.billing_prepare_setup_invoice(
 p_company_id uuid, p_offer_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_offer record;
 v_invoice public.billing_setup_invoices%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_company_id is null or p_offer_id is null then
  raise exception 'Company and offer are required';
 end if;
 if not exists (
  select 1 from public.company_members m
  where m.company_id=p_company_id and m.user_id=auth.uid() and m.role='admin'
 ) then raise exception 'Only company administrators can prepare setup invoices'; end if;

 select o.id,o.plan_id,o.currency,o.billing_interval,o.setup_fee_minor
 into v_offer
 from public.billing_commercial_offers o
 join public.billing_plans p on p.id=o.plan_id and p.is_visible
 where o.id=p_offer_id and o.status='approved';
 if not found then raise exception 'Approved commercial offer not found'; end if;
 if v_offer.setup_fee_minor is null or v_offer.setup_fee_minor<=0 then
  raise exception 'This offer does not require a setup invoice';
 end if;

 -- Serialize setup draft creation by company and prevent double invoicing.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('setup:'||p_company_id::text));
 select * into v_invoice from public.billing_setup_invoices
 where company_id=p_company_id for update;

 if found then
  if v_invoice.status <> 'draft' then
   raise exception 'An issued or completed setup invoice already exists for this company';
  end if;
  if v_invoice.commercial_offer_id<>v_offer.id then
   update public.billing_setup_invoices
   set commercial_offer_id=v_offer.id, plan_id=v_offer.plan_id,
       currency=v_offer.currency, billing_interval=v_offer.billing_interval,
       amount_minor=v_offer.setup_fee_minor, updated_at=now()
   where id=v_invoice.id
   returning * into v_invoice;
  end if;
 else
  insert into public.billing_setup_invoices
   (company_id,commercial_offer_id,plan_id,currency,billing_interval,
    amount_minor,created_by)
  values
   (p_company_id,v_offer.id,v_offer.plan_id,v_offer.currency,
    v_offer.billing_interval,v_offer.setup_fee_minor,auth.uid())
  returning * into v_invoice;
 end if;

 return pg_catalog.jsonb_build_object(
  'id',v_invoice.id,'status',v_invoice.status,
  'amount_minor',v_invoice.amount_minor,'currency',v_invoice.currency,
  'plan_id',v_invoice.plan_id
 );
end;
$$;

revoke all on function public.billing_prepare_setup_invoice(uuid,uuid)
 from public,anon;
grant execute on function public.billing_prepare_setup_invoice(uuid,uuid)
 to authenticated;

commit;
-- Drafts are not payable tax invoices.
-- No Paymob setup payment flow or automated 'paid' status exists yet.
