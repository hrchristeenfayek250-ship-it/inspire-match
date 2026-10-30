-- Inspire Match ATS | Billing actual usage snapshot (v4)
-- Requires saas_billing_foundation.sql and saas_billing_plan_entitlements.sql.
-- Read-only snapshots, without usage caps or paid-feature enforcement.
create or replace function public.billing_usage_snapshot(p_company_id uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_plan text;
 v_limits jsonb;
 v_jobs bigint;
 v_candidates bigint;
 v_members bigint;
begin
 if auth.uid() is null then
   raise exception 'Sign in to see subscription usage';
 end if;
 if p_company_id is null or not exists(
   select 1 from public.company_members m
   where m.company_id=p_company_id
     and m.user_id=auth.uid()
     and m.role='admin'
 ) then
   raise exception 'Only company admins can view billing usage';
 end if;

 select s.plan_id into v_plan
 from public.company_subscriptions s
 where s.company_id=p_company_id
   and s.status in ('active','trialing')
   and s.current_period_end>now();

 select coalesce(jsonb_object_agg(q.quota_key,q.limit_value),'{}'::jsonb)
   into v_limits
 from public.billing_plan_quotas q
 where q.plan_id=v_plan;

 select count(*) into v_jobs from public.jobs j
 where j.company_id=p_company_id and lower(coalesce(j.status,''))='active';

 select count(*) into v_candidates from public.candidates c
 where c.company_id=p_company_id and c.deleted_at is null;

 select count(*) into v_members from public.company_members m
 where m.company_id=p_company_id;

 return jsonb_build_object(
   'company_id',p_company_id,
   'current_plan',v_plan,
   'usage',jsonb_build_object(
     'active_jobs',v_jobs,
     'candidate_records',v_candidates,
     'team_members',v_members,
     'ai_requests_per_month',null
   ),
   'limits',coalesce(v_limits,'{}'::jsonb),
   'ai_usage_status','not_metered',
   'as_of',now(),
   'enforcement_enabled',false
 );
end $$;
revoke all on function public.billing_usage_snapshot(uuid) from public,anon;
grant execute on function public.billing_usage_snapshot(uuid) to authenticated;
