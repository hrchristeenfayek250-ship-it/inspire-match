-- Inspire Match | Internal company configuration read-only foundation.
-- Apply after saas_billing_private_sales_split.sql.
-- No activation, subscription assignment, charge, invoice, or entitlement enforcement.
begin;

create or replace function public.billing_internal_company_configurations()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_role text;
declare v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode='42501';
  end if;
  select s.staff_role into v_role
  from public.billing_internal_staff s
  where s.user_id=auth.uid() and s.is_active;
  if v_role is null and not exists(
    select 1 from public.billing_finance_reviewers r
    where r.user_id=auth.uid() and r.is_active
  ) then
    raise exception 'Inspire Match internal access required' using errcode='42501';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c)), '[]'::jsonb)
  into v_items
  from (
    select co.id as company_id,
           coalesce(a.activation_status,'not_configured') as activation_status,
           a.approved_at,
           s.plan_id as internal_plan_id,
           coalesce(s.status,'none') as subscription_status,
           s.current_period_end,
           s.provider,
           coalesce(
             (select pg_catalog.jsonb_object_agg(o.feature_key,o.enabled)
              from public.billing_company_feature_overrides o
              where o.company_id=co.id),
             '{}'::jsonb
           ) as feature_overrides
    from public.companies co
    left join public.billing_company_activation a on a.company_id=co.id
    left join public.company_subscriptions s on s.company_id=co.id
    order by co.id
    limit 250
  ) c;

  return pg_catalog.jsonb_build_object(
    'companies',v_items,
    'read_only',true,
    'activation_enforcement_enabled',false,
    'subscription_enforcement_enabled',false
  );
end;
$$;

revoke all on function public.billing_internal_company_configurations() from public,anon;
grant execute on function public.billing_internal_company_configurations() to authenticated;
commit;
