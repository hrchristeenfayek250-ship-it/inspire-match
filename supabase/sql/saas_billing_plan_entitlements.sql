-- Inspire Match ATS: plan feature entitlements (draft; not active enforcement)
-- Apply after the Billing Foundation migration.
create table if not exists public.billing_feature_catalog (
  feature_key text primary key,
  display_name text not null,
  category text not null,
  description text not null default ''
);
create table if not exists public.billing_plan_entitlements (
  plan_id text not null references public.billing_plans(id),
  feature_key text not null references public.billing_feature_catalog(feature_key),
  enabled boolean not null default false,
  primary key (plan_id, feature_key)
);
create table if not exists public.billing_plan_quotas (
  plan_id text not null references public.billing_plans(id),
  quota_key text not null,
  limit_value integer check (limit_value is null or limit_value >= 0),
  primary key (plan_id, quota_key)
);
