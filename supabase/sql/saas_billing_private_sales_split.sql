-- Inspire Match ATS | Private Sales & Client Billing separation
-- Apply after saas_billing_sales_led_hybrid.sql.
-- Read-only internal overview. No charge, price seed, company activation, or invoice issuance.
begin;

-- Only a trusted database operator may enroll internal staff. Tenant roles never qualify.
create table if not exists public.billing_internal_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 staff_role text not null check (staff_role in ('sales','finance','platform_admin')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.billing_internal_staff enable row level security;
revoke all on public.billing_internal_staff from anon,authenticated;
grant select,insert,update,delete on public.billing_internal_staff to service_role;

-- Existing explicitly enrolled finance reviewers remain recognized.
-- They are NOT provisioned as sales staff or granted tenant administrator rights.
create or replace function public.billing_is_internal_staff()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and (
  exists (
   select 1 from public.billing_internal_staff s
   where s.user_id=auth.uid() and s.is_active
  ) or exists (
   select 1 from public.billing_finance_reviewers r
   where r.user_id=auth.uid() and r.is_active
  )
 );
$$;
revoke all on function public.billing_is_internal_staff() from public,anon;
grant execute on function public.billing_is_internal_staff() to authenticated;

-- Remove the old shared price/offer catalog access for any signed-in user.
drop policy if exists billing_prices_read on public.billing_plan_prices;
drop policy if exists billing_prices_internal_read on public.billing_plan_prices;
create policy billing_prices_internal_read on public.billing_plan_prices
 for select to authenticated using (public.billing_is_internal_staff());

drop policy if exists billing_commercial_offers_approved_read on public.billing_commercial_offers;
drop policy if exists billing_commercial_offers_internal_read on public.billing_commercial_offers;
create policy billing_commercial_offers_internal_read on public.billing_commercial_offers
 for select to authenticated using (public.billing_is_internal_staff());

-- Internal tier/package names stay private. Clients see only contracted
-- services through their own access snapshot, not the global tier catalog.
drop policy if exists billing_plans_read on public.billing_plans;
drop policy if exists billing_plans_private_read on public.billing_plans;
drop policy if exists billing_plans_internal_read on public.billing_plans;
create policy billing_plans_internal_read on public.billing_plans
 for select to authenticated using (public.billing_is_internal_staff());

-- The feature catalog and uncontracted plan feature/quotas matrix are internal.
-- Client-facing access is delivered through billing_my_hybrid_access_snapshot
-- after its own membership check, without publishing the full catalog.
drop policy if exists billing_feature_catalog_read on public.billing_feature_catalog;
drop policy if exists billing_feature_catalog_internal_read on public.billing_feature_catalog;
create policy billing_feature_catalog_internal_read on public.billing_feature_catalog
 for select to authenticated using (public.billing_is_internal_staff());

drop policy if exists billing_plan_entitlements_read on public.billing_plan_entitlements;
drop policy if exists billing_plan_entitlements_internal_read on public.billing_plan_entitlements;
create policy billing_plan_entitlements_internal_read on public.billing_plan_entitlements
 for select to authenticated using (public.billing_is_internal_staff());

drop policy if exists billing_plan_quotas_read on public.billing_plan_quotas;
drop policy if exists billing_plan_quotas_internal_read on public.billing_plan_quotas;
create policy billing_plan_quotas_internal_read on public.billing_plan_quotas
 for select to authenticated using (public.billing_is_internal_staff());

-- Setup draft preparation/review belongs to internal commercial operations.
-- Existing SQL objects and historical drafts are retained, but direct customer
-- execution is turned off until a reviewed sales-admin workflow is released.
revoke execute on function public.billing_prepare_setup_invoice(uuid,uuid)
 from public,anon,authenticated;
revoke execute on function public.billing_save_setup_invoice_details(
 uuid,text,text,text,text,text) from public,anon,authenticated;
revoke execute on function public.billing_submit_setup_invoice_review(uuid)
 from public,anon,authenticated;

drop policy if exists billing_setup_invoices_admin_read on public.billing_setup_invoices;
drop policy if exists billing_setup_invoices_internal_read on public.billing_setup_invoices;
create policy billing_setup_invoices_internal_read on public.billing_setup_invoices
 for select to authenticated using (public.billing_is_internal_staff());

-- Sales-led subscriptions require contacting Sales to change contracted terms.
revoke execute on function public.billing_set_cancel_at_period_end(uuid,boolean)
 from public,anon,authenticated;

-- Disable the old broad membership snapshot endpoints so ordinary HR users
-- cannot inspect internal plan identifiers. The client-facing snapshot below
-- deliberately omits plan_id, while retaining authorized feature summaries.
revoke execute on function public.billing_my_access_snapshot(uuid)
 from public,anon,authenticated;
revoke execute on function public.billing_my_hybrid_access_snapshot(uuid)
 from public,anon,authenticated;

create or replace function public.billing_my_private_access_snapshot(p_company_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_snapshot jsonb;
begin
 -- Original function checks current auth.uid() membership in this company.
 v_snapshot := public.billing_my_hybrid_access_snapshot(p_company_id);
 return v_snapshot - 'plan_id';
end;
$$;
revoke all on function public.billing_my_private_access_snapshot(uuid)
 from public,anon;
grant execute on function public.billing_my_private_access_snapshot(uuid)
 to authenticated;

-- An authenticated finance/sales-only read-only operational overview.
-- SECURITY DEFINER checks internal allowlisting explicitly before returning
-- any commercial details; tenant-admin membership is insufficient.
create or replace function public.billing_internal_overview()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_role text;
 v_plans jsonb;
 v_offers jsonb;
 v_subscriptions jsonb;
 v_setups jsonb;
 v_can_finance boolean;
begin
 if not public.billing_is_internal_staff() then
  raise exception 'Internal Inspire Match Sales or Finance access required'
   using errcode='42501';
 end if;

 select s.staff_role into v_role
 from public.billing_internal_staff s
 where s.user_id=auth.uid() and s.is_active;

 select exists(
  select 1 from public.billing_finance_reviewers r
  where r.user_id=auth.uid() and r.is_active
 ) into v_can_finance;
 v_role := coalesce(v_role,case when v_can_finance then 'finance' else 'unknown' end);

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)),'[]'::jsonb)
 into v_plans from (
  select id,name,description,sort_order from public.billing_plans
  order by sort_order,id
 ) x;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)),'[]'::jsonb)
 into v_offers from (
  select id,plan_id,currency,billing_interval,status,setup_fee_minor,
   recurring_fee_minor,tax_policy,updated_at
  from public.billing_commercial_offers
  order by updated_at desc limit 100
 ) x;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)),'[]'::jsonb)
 into v_subscriptions from (
  select s.company_id,s.plan_id,s.status,s.provider,s.started_at,
   s.current_period_end,s.cancel_at_period_end,
   coalesce(a.activation_status,'not_configured') as activation_status
  from public.company_subscriptions s
  left join public.billing_company_activation a on a.company_id=s.company_id
  order by s.updated_at desc limit 100
 ) x;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x)),'[]'::jsonb)
 into v_setups from (
  select i.id,i.company_id,i.plan_id,i.currency,i.amount_minor,
   i.status,i.review_status,i.submitted_at,i.reviewed_at,
   i.bill_to_name,i.bill_to_email
  from public.billing_setup_invoices i
  order by i.updated_at desc limit 100
 ) x;

 return pg_catalog.jsonb_build_object(
  'staff_role',v_role,'can_review_finance',v_can_finance,
  'plans',v_plans,'offers',v_offers,
  'subscriptions',v_subscriptions,'setup_invoices',v_setups,
  'self_service_checkout_enabled',false,
  'feature_enforcement_enabled',false
 );
end;
$$;
revoke all on function public.billing_internal_overview() from public,anon;
grant execute on function public.billing_internal_overview() to authenticated;

commit;
-- No staff is auto-added. Existing verified Finance Reviewer remains internal.
-- Company administrators retain their own subscription/payment history via RLS.
