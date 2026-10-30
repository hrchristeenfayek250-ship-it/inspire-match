-- Inspire Match ATS / SaaS plan feature entitlements (draft, not enforced)
-- Run after saas_billing_foundation.sql. No live subscription is changed.
create table if not exists public.billing_feature_catalog (
 feature_key text primary key,
 display_name text not null,
 category text not null,
 description text not null default ''
);
insert into public.billing_feature_catalog(feature_key,display_name,category) values
 ('job_management','Jobs and candidates','Recruitment'),
 ('interviews','Interviews','Recruitment'),
 ('essential_reports','Essential reports','Analytics'),
 ('ai_matching','AI matching','AI'),
 ('ai_shortlisting','AI shortlisting','AI'),
 ('advanced_analytics','Advanced analytics','Analytics'),
 ('recruitment_operations','Recruitment operations','Operations'),
 ('ask_inspire_ai','Ask Inspire AI','AI'),
 ('custom_support','Enterprise support','Enterprise')
on conflict(feature_key) do nothing;

create table if not exists public.billing_plan_entitlements (
 plan_id text not null references public.billing_plans(id) on delete cascade,
 feature_key text not null references public.billing_feature_catalog(feature_key),
 enabled boolean not null default false,
 primary key(plan_id,feature_key)
);
insert into public.billing_plan_entitlements(plan_id,feature_key,enabled)
select p.id,f.feature_key,
 case when p.id='enterprise' then true
 when p.id='professional' and f.feature_key<>'custom_support' then true
 when p.id='starter' and f.feature_key in ('job_management','interviews','essential_reports') then true
 else false end
from public.billing_plans p cross join public.billing_feature_catalog f
on conflict(plan_id,feature_key) do nothing;

create table if not exists public.billing_plan_quotas (
 plan_id text not null references public.billing_plans(id) on delete cascade,
 quota_key text not null check(quota_key in ('active_jobs','team_members','ai_requests_per_month','candidate_records')),
 limit_value integer check(limit_value is null or limit_value>=0),
 primary key(plan_id,quota_key)
);
insert into public.billing_plan_quotas(plan_id,quota_key,limit_value)
select p.id,q.quota_key,null
from public.billing_plans p cross join
 (values ('active_jobs'),('team_members'),('ai_requests_per_month'),('candidate_records')) q(quota_key)
on conflict(plan_id,quota_key) do nothing;

alter table public.billing_feature_catalog enable row level security;
alter table public.billing_plan_entitlements enable row level security;
alter table public.billing_plan_quotas enable row level security;
drop policy if exists billing_feature_catalog_read on public.billing_feature_catalog;
create policy billing_feature_catalog_read on public.billing_feature_catalog
 for select to authenticated using(true);
drop policy if exists billing_plan_entitlements_read on public.billing_plan_entitlements;
create policy billing_plan_entitlements_read on public.billing_plan_entitlements
 for select to authenticated using(exists(select 1 from public.billing_plans p where p.id=billing_plan_entitlements.plan_id and p.is_visible));
drop policy if exists billing_plan_quotas_read on public.billing_plan_quotas;
create policy billing_plan_quotas_read on public.billing_plan_quotas
 for select to authenticated using(exists(select 1 from public.billing_plans p where p.id=billing_plan_quotas.plan_id and p.is_visible));
-- No client writes. Quotas deliberately unset until pricing and capacity approval.
