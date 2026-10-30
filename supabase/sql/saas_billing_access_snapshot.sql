-- Read-only, tenant-safe billing access snapshot.
-- This is informational only. It does not enforce access or override current ATS permissions.
create or replace function public.billing_my_access_snapshot(p_company_id uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_sub record;
 v_features jsonb := '{}'::jsonb;
 v_quotas jsonb := '{}'::jsonb;
 v_valid boolean := false;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists (
  select 1 from public.company_members m
  where m.company_id=p_company_id and m.user_id=auth.uid()
 ) then raise exception 'Company membership required'; end if;

 select s.plan_id,s.status,s.current_period_end,s.cancel_at_period_end
 into v_sub from public.company_subscriptions s where s.company_id=p_company_id;

 v_valid := found and v_sub.status in ('active','trialing')
  and v_sub.current_period_end is not null and v_sub.current_period_end > now();

 if v_valid then
  select coalesce(jsonb_object_agg(e.feature_key,e.enabled),'{}'::jsonb)
  into v_features
  from public.billing_plan_entitlements e where e.plan_id=v_sub.plan_id;

  select coalesce(jsonb_object_agg(q.quota_key,q.limit_value),'{}'::jsonb)
  into v_quotas
  from public.billing_plan_quotas q where q.plan_id=v_sub.plan_id;
 end if;

 return jsonb_build_object(
  'company_id',p_company_id,
  'plan_id',case when v_valid then v_sub.plan_id else null end,
  'subscription_status',coalesce(v_sub.status,'none'),
  'period_end',v_sub.current_period_end,
  'cancel_at_period_end',coalesce(v_sub.cancel_at_period_end,false),
  'subscription_valid',v_valid,
  'features',v_features,
  'quotas',v_quotas,
  'enforcement_enabled',false
 );
end $$;
revoke all on function public.billing_my_access_snapshot(uuid) from public,anon;
grant execute on function public.billing_my_access_snapshot(uuid) to authenticated;
