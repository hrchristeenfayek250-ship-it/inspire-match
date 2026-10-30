-- Inspire Match ATS | OMR to USD currency migration
-- Self-contained: creates the draft commercial offers table if it was not applied yet.
-- Safe to rerun. No prices are published, charged, or activated here.
begin;

create table if not exists public.billing_commercial_offers (
 id uuid primary key default gen_random_uuid(),
 plan_id text not null references public.billing_plans(id),
 currency text not null check(currency in ('EGP','SAR','AED','USD')),
 billing_interval text not null check(billing_interval in ('month','year')),
 setup_fee_minor bigint check(setup_fee_minor is null or setup_fee_minor >= 0),
 recurring_fee_minor bigint check(recurring_fee_minor is null or recurring_fee_minor > 0),
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 tax_policy text not null default 'pending_review',
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(plan_id,currency,billing_interval),
 constraint approved_offer_complete check(
  status <> 'approved' or
  (setup_fee_minor is not null and recurring_fee_minor is not null and tax_policy <> 'pending_review')
 )
);

alter table public.billing_commercial_offers enable row level security;
drop policy if exists billing_commercial_offers_approved_read on public.billing_commercial_offers;
create policy billing_commercial_offers_approved_read
on public.billing_commercial_offers for select to authenticated
using (
 status='approved' and
 exists(select 1 from public.billing_plans p
  where p.id=billing_commercial_offers.plan_id and p.is_visible)
);

-- Protect any existing OMR offer or pricing rows: they must be reviewed rather than silently changed.
do $$
begin
 if exists(select 1 from public.billing_plan_prices where currency='OMR')
    or exists(select 1 from public.billing_commercial_offers where currency='OMR')
 then
  raise exception 'OMR prices exist: review existing rows before removing OMR from allowed currencies';
 end if;
end $$;

alter table public.billing_plan_prices
 drop constraint if exists billing_plan_prices_currency_check;
alter table public.billing_plan_prices
 add constraint billing_plan_prices_currency_check check(currency in ('EGP','SAR','AED','USD'));

alter table public.billing_commercial_offers
 drop constraint if exists billing_commercial_offers_currency_check;
alter table public.billing_commercial_offers
 add constraint billing_commercial_offers_currency_check check(currency in ('EGP','SAR','AED','USD'));

commit;
-- USD may be shown for future pricing; Paymob USD acceptance/settlement still requires merchant verification.
