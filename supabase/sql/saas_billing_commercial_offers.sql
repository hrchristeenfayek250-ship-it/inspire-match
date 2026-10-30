-- Inspire Match ATS | Draft commercial pricing model
-- Setup fees and recurring fees are separate. No prices are activated by this migration.
-- This draft catalog does NOT change existing checkout amounts.
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
 constraint approved_offer_complete check (
  status <> 'approved' or (setup_fee_minor is not null and recurring_fee_minor is not null and tax_policy <> 'pending_review')
 )
);
alter table public.billing_commercial_offers enable row level security;
-- Only approved offers are readable by signed-in customers.
drop policy if exists billing_commercial_offers_approved_read on public.billing_commercial_offers;
create policy billing_commercial_offers_approved_read
on public.billing_commercial_offers for select to authenticated
using(status='approved' and exists(select 1 from public.billing_plans p where p.id=billing_commercial_offers.plan_id and p.is_visible));
-- No customer-side insert/update/delete policies.
-- Deliberately no default prices: amounts and taxes require commercial approval.
-- Checkout still charges ONLY the existing billing_plan_prices.amount_minor;
-- setup fees are NOT charged until a separate invoice/checkout implementation exists.
