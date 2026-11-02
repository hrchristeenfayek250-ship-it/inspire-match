-- Inspire Match ATS | Sales-led Hybrid SaaS foundation.
-- Apply after saas_billing_foundation.sql and saas_billing_plan_entitlements.sql.
-- No subscription is activated, no prices are published, and no payment is collected.
begin;

-- Company-specific optional features; plan defaults remain untouched.
-- Only trusted backend/service_role can configure these records.
create table if not exists public.billing_company_feature_overrides (
 company_id uuid not null references public.companies(id) on delete cascade,
 feature_key text not null references public.billing_feature_catalog(feature_key),
 enabled boolean not null,
 internal_note text not null default '',
 updated_at timestamptz not null default now(),
 primary key (company_id,feature_key)
);
create index if not exists billing_company_feature_overrides_feature_idx
 on public.billing_company_feature_overrides(feature_key);
alter table public.billing_company_feature_overrides enable row level security;
revoke all on public.billing_company_feature_overrides from anon,authenticated;
grant select,insert,update,delete on public.billing_company_feature_overrides to service_role;

-- Sales-controlled onboarding state, separate from existing membership and invitations.
-- Do not enforce activation against ATS routes until the rollout is explicitly approved.
create table if not exists public.billing_company_activation (
 company_id uuid primary key references public.companies(id) on delete cascade,
 activation_status text not null default 'pending'
   check (activation_status in ('pending','approved','suspended')),
 internal_note text not null default '',
 approved_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.billing_company_activation enable row level security;
revoke all on public.billing_company_activation from anon,authenticated;
grant select,insert,update,delete on public.billing_company_activation to service_role;

-- Block old direct-to-Paymob RPC even if called without the Next.js API.
create or replace function public.billing_start_checkout(
 p_company_id uuid,p_price_id uuid,p_provider_mode text
) returns jsonb language plpgsql security invoker set search_path=''
as $$
begin
 raise exception 'Self-service checkout is disabled. Contact Inspire Match Sales.'
 using errcode='42501';
end;
$$;
revoke all on function public.billing_start_checkout(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.billing_start_checkout(uuid,uuid,text) to service_role;

-- Read-only informational hybrid access snapshot; does not enforce ATS routes.
create or replace function public.billing_my_hybrid_access_snapshot(p_company_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare
 v_sub record;
 v_active boolean := false;
 v_features jsonb := '{}'::jsonb;
 v_quotas jsonb := '{}'::jsonb;
 v_activation text := 'not_configured';
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(
  select 1 from public.company_members m
  where m.company_id=p_company_id and m.user_id=auth.uid()
 ) then raise exception 'Company membership required'; end if;

 select s.plan_id,s.status,s.current_period_end
 into v_sub from public.company_subscriptions s
 where s.company_id=p_company_id;

 v_active := found and v_sub.status in ('active','trialing')
   and v_sub.current_period_end is not null and v_sub.current_period_end>now();

 select coalesce(a.activation_status,'not_configured') into v_activation
 from public.billing_company_activation a where a.company_id=p_company_id;
 if not found then v_activation := 'not_configured'; end if;

 if v_active then
  select coalesce(pg_catalog.jsonb_object_agg(
   e.feature_key,coalesce(o.enabled,e.enabled)
  ),'{}'::jsonb) into v_features
  from public.billing_plan_entitlements e
  left join public.billing_company_feature_overrides o
   on o.company_id=p_company_id and o.feature_key=e.feature_key
  where e.plan_id=v_sub.plan_id;

  -- An optional add-on can be enabled even if absent from a plan's base matrix.
  select v_features || coalesce(pg_catalog.jsonb_object_agg(
   o.feature_key,o.enabled
  ),'{}'::jsonb) into v_features
  from public.billing_company_feature_overrides o
  where o.company_id=p_company_id;

  select coalesce(pg_catalog.jsonb_object_agg(q.quota_key,q.limit_value),'{}'::jsonb)
  into v_quotas from public.billing_plan_quotas q
  where q.plan_id=v_sub.plan_id;
 end if;

 return pg_catalog.jsonb_build_object(
  'company_id',p_company_id,
  'model','core_plus_optional_addons',
  'plan_id',case when v_active then v_sub.plan_id else null end,
  'subscription_status',coalesce(v_sub.status,'none'),
  'subscription_valid',v_active,
  'activation_status',v_activation,
  'features',v_features,
  'quotas',v_quotas,
  'enforcement_enabled',false,
  'self_service_checkout_enabled',false
 );
end;
$$;
revoke all on function public.billing_my_hybrid_access_snapshot(uuid)
 from public,anon;
grant execute on function public.billing_my_hybrid_access_snapshot(uuid)
 to authenticated;
commit;
