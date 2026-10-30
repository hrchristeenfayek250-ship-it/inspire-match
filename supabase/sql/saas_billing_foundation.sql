-- Inspire Match ATS | SaaS billing foundation (v1)
-- Execute in Supabase SQL Editor before using Billing.
-- Prices are intentionally NOT seeded: finance must approve amounts/currency/taxes.
-- All financial writes are backend-only; company admins can read their own billing.
create extension if not exists pgcrypto;

create table if not exists public.billing_plans (
  id text primary key check (id in ('starter','professional','enterprise')),
  name text not null,
  description text not null default '',
  feature_list jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.billing_plans (id,name,description,feature_list,limits,sort_order)
values
('starter','Starter','For smaller recruitment teams.','["Job and candidate management","Recruitment pipeline","Interview management","Essential reports"]'::jsonb,'{}'::jsonb,10),
('professional','Professional','Advanced recruitment workflows and intelligence.','["Everything in Starter","AI recruitment workflows","Advanced analytics","Recruitment operations"]'::jsonb,'{}'::jsonb,20),
('enterprise','Enterprise','For larger teams requiring tailored deployment.','["Everything in Professional","Tailored controls and support","Custom commercial agreement"]'::jsonb,'{}'::jsonb,30)
on conflict (id) do nothing;

create table if not exists public.billing_plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.billing_plans(id),
  currency text not null check (currency in ('EGP','SAR','AED','OMR')),
  billing_interval text not null check (billing_interval in ('month','year')),
  amount_minor bigint not null check (amount_minor > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (plan_id,currency,billing_interval)
);

create table if not exists public.company_subscriptions (
  company_id uuid primary key references public.companies(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),
  status text not null check (status in ('trialing','active','past_due','canceled','expired')),
  provider text check (provider is null or provider in ('paymob','manual')),
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  latest_invoice_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_id text not null references public.billing_plans(id),
  price_id uuid not null references public.billing_plan_prices(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  billing_interval text not null check (billing_interval in ('month','year')),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','void')),
  provider text not null default 'paymob',
  provider_order_id text unique,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  created_by uuid references auth.users(id)
);

alter table public.company_subscriptions
  drop constraint if exists company_subscriptions_latest_invoice_fk;
alter table public.company_subscriptions
  add constraint company_subscriptions_latest_invoice_fk
  foreign key (latest_invoice_id) references public.billing_invoices(id) on delete set null;

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null unique references public.billing_invoices(id) on delete cascade,
  price_id uuid not null references public.billing_plan_prices(id),
  created_by uuid not null references auth.users(id),
  provider text not null default 'paymob',
  provider_mode text not null check (provider_mode in ('test','live')),
  provider_order_id text unique,
  provider_intention_id text unique,
  status text not null default 'initiated' check (status in ('initiated','pending','paid','failed','expired')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '1 hour')
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.billing_invoices(id),
  provider text not null,
  provider_transaction_id text not null,
  amount_minor bigint not null,
  currency text not null,
  status text not null check (status in ('paid','failed','refunded')),
  created_at timestamptz not null default now(),
  unique(provider,provider_transaction_id)
);

create table if not exists public.billing_webhook_events (
  event_key text primary key,
  provider text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.billing_invoices(id),
  received_at timestamptz not null default now()
);

create index if not exists billing_invoice_company_idx on public.billing_invoices(company_id,issued_at desc);
create index if not exists billing_checkout_company_idx on public.billing_checkout_sessions(company_id,created_at desc);
create index if not exists billing_payment_company_idx on public.billing_payments(company_id,created_at desc);

alter table public.billing_plans enable row level security;
alter table public.billing_plan_prices enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_checkout_sessions enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_webhook_events enable row level security;

drop policy if exists billing_plans_read on public.billing_plans;
create policy billing_plans_read on public.billing_plans for select to authenticated
using(is_visible);
drop policy if exists billing_prices_read on public.billing_plan_prices;
create policy billing_prices_read on public.billing_plan_prices for select to authenticated
using(is_active and exists (select 1 from public.billing_plans p where p.id=billing_plan_prices.plan_id and p.is_visible));
drop policy if exists billing_subscriptions_admin_read on public.company_subscriptions;
create policy billing_subscriptions_admin_read on public.company_subscriptions for select to authenticated
using(exists(select 1 from public.company_members m where m.company_id=company_subscriptions.company_id and m.user_id=auth.uid() and m.role='admin'));
drop policy if exists billing_invoices_admin_read on public.billing_invoices;
create policy billing_invoices_admin_read on public.billing_invoices for select to authenticated
using(exists(select 1 from public.company_members m where m.company_id=billing_invoices.company_id and m.user_id=auth.uid() and m.role='admin'));
drop policy if exists billing_payments_admin_read on public.billing_payments;
create policy billing_payments_admin_read on public.billing_payments for select to authenticated
using(exists(select 1 from public.company_members m where m.company_id=billing_payments.company_id and m.user_id=auth.uid() and m.role='admin'));

-- No INSERT/UPDATE/DELETE client policies on any billing table.
-- SECURITY DEFINER RPC validates company admin + active price and atomically issues a pending invoice.
create or replace function public.billing_start_checkout(
  p_company_id uuid, p_price_id uuid, p_provider_mode text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_price record; v_session uuid; v_invoice uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to manage billing'; end if;
  if p_provider_mode not in ('test','live') then raise exception 'Invalid payment environment'; end if;
  if not exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=auth.uid() and m.role='admin') then
    raise exception 'Only company admins can start checkout';
  end if;
  select pr.id, pr.plan_id, pr.currency, pr.billing_interval, pr.amount_minor
    into v_price
  from public.billing_plan_prices pr join public.billing_plans pl on pl.id=pr.plan_id
  where pr.id=p_price_id and pr.is_active and pl.is_visible;
  if not found then raise exception 'Selected plan price is not available'; end if;
  if v_price.amount_minor <= 0 then raise exception 'Invalid price'; end if;
  if exists(select 1 from public.company_subscriptions sub where sub.company_id=p_company_id and sub.plan_id=v_price.plan_id and sub.status in ('active','trialing') and sub.current_period_end>now()) then
    raise exception 'This subscription plan is already active';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_company_id::text));
  if exists(select 1 from public.billing_checkout_sessions cs
    where cs.company_id=p_company_id and cs.status in ('initiated','pending')
    and cs.created_at > now()-interval '15 minutes') then
    raise exception 'A recent checkout is already in progress. Please try again later.';
  end if;
  insert into public.billing_invoices(company_id,plan_id,price_id,amount_minor,currency,billing_interval,created_by)
  values(p_company_id,v_price.plan_id,v_price.id,v_price.amount_minor,v_price.currency,v_price.billing_interval,auth.uid())
  returning id into v_invoice;
  insert into public.billing_checkout_sessions(company_id,invoice_id,price_id,created_by,provider_mode,amount_minor,currency)
  values(p_company_id,v_invoice,v_price.id,auth.uid(),p_provider_mode,v_price.amount_minor,v_price.currency)
  returning id into v_session;
  return pg_catalog.jsonb_build_object('checkout_id',v_session,'invoice_id',v_invoice,'amount_minor',v_price.amount_minor,'currency',v_price.currency,'plan_id',v_price.plan_id);
end $$;
revoke all on function public.billing_start_checkout(uuid,uuid,text) from public,anon;
grant execute on function public.billing_start_checkout(uuid,uuid,text) to authenticated;

-- Server-only atomic activation; called only AFTER verifying the Paymob HMAC.
create or replace function public.billing_apply_paymob_transaction(
 p_provider_order_id text, p_transaction_id text, p_amount_minor bigint,
 p_currency text, p_success boolean, p_refunded boolean, p_is_live boolean
) returns text
language plpgsql security definer set search_path=''
as $$
declare
  s record; i record; v_key text; v_inserted text; v_status text;
begin
  select * into s from public.billing_checkout_sessions
    where provider_order_id=p_provider_order_id for update;
  if not found then return 'unknown_order'; end if;
  if s.provider_mode <> (case when p_is_live then 'live' else 'test' end) then return 'environment_mismatch'; end if;
  if s.amount_minor<>p_amount_minor or s.currency<>p_currency then return 'amount_mismatch'; end if;
  if p_transaction_id is null or length(p_transaction_id)=0 then return 'missing_transaction'; end if;
  select * into i from public.billing_invoices where id=s.invoice_id for update;
  if not found or i.company_id<>s.company_id or i.amount_minor<>s.amount_minor or i.currency<>s.currency then
    return 'invoice_mismatch';
  end if;
  v_status := case when p_refunded then 'refunded' when p_success then 'paid' else 'failed' end;
  v_key := 'paymob:'||p_transaction_id||':'||v_status;
  insert into public.billing_webhook_events(event_key,provider,company_id,invoice_id)
    values(v_key,'paymob',s.company_id,s.invoice_id)
    on conflict do nothing returning event_key into v_inserted;
  if v_inserted is null then return 'duplicate'; end if;
  insert into public.billing_payments(company_id,invoice_id,provider,provider_transaction_id,amount_minor,currency,status)
  values(s.company_id,s.invoice_id,'paymob',p_transaction_id,p_amount_minor,p_currency,v_status)
  on conflict(provider,provider_transaction_id) do update
    set status=excluded.status
    where public.billing_payments.invoice_id=excluded.invoice_id
      and public.billing_payments.status <> 'refunded';
  if p_refunded then
    if i.status='paid' then
      update public.billing_invoices set status='refunded' where id=i.id;
      update public.company_subscriptions set status='past_due',updated_at=now()
        where company_id=s.company_id and latest_invoice_id=i.id;
    end if;
    return 'refunded';
  end if;
  if p_success then
    if i.status='refunded' then return 'already_refunded'; end if;
    update public.billing_invoices set status='paid',paid_at=coalesce(paid_at,now()) where id=i.id;
    update public.billing_checkout_sessions set status='paid' where id=s.id;
    -- A delayed older successful payment must not overwrite a newer subscription.
    if exists(select 1 from public.company_subscriptions sub
      join public.billing_invoices newer on newer.id=sub.latest_invoice_id
      where sub.company_id=s.company_id and newer.issued_at>i.issued_at) then
      return 'paid_previous_invoice';
    end if;
    if not exists(select 1 from public.company_subscriptions sub where sub.company_id=s.company_id and sub.latest_invoice_id=i.id) then
      insert into public.company_subscriptions(company_id,plan_id,status,provider,current_period_start,current_period_end,latest_invoice_id,updated_at)
      values(s.company_id,i.plan_id,'active','paymob',now(),
        now()+case when i.billing_interval='year' then interval '1 year' else interval '1 month' end,
        i.id,now())
      on conflict(company_id) do update
       set plan_id=excluded.plan_id,status='active',provider='paymob',
        current_period_start=excluded.current_period_start,
        current_period_end=excluded.current_period_end,
        cancel_at_period_end=false,latest_invoice_id=i.id,updated_at=now();
    end if;
    return 'paid';
  end if;
  -- Failed attempts are logged, but must not cancel a valid prior payment.
  if i.status='pending' then
    update public.billing_checkout_sessions set status='failed' where id=s.id;
    update public.billing_invoices set status='failed' where id=i.id;
  end if;
  return 'failed';
end $$;
revoke all on function public.billing_apply_paymob_transaction(text,text,bigint,text,boolean,boolean,boolean)
  from public,anon,authenticated;
grant execute on function public.billing_apply_paymob_transaction(text,text,bigint,text,boolean,boolean,boolean) to service_role;

-- To enable checkout AFTER approving commercial prices, insert rows like:
-- insert into public.billing_plan_prices(plan_id,currency,billing_interval,amount_minor,is_active)
-- values('starter','EGP','month',<approved_minor_units>,true);
-- No subscription, payment, or invoice is created by this migration.
