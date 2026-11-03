-- Inspire Match ATS | Tenant Access & Activation Security Audit (read only)
-- Apply AFTER saas_sales_workspace_reconciliation.sql.
-- No changes to company access, tenant membership, activation, subscriptions or pricing.
begin;

create or replace function public.billing_internal_tenant_security_audit()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
  v_total_companies bigint;
  v_missing_admin bigint;
  v_multiple_admins bigint;
  v_missing_activation bigint;
  v_active_without_approval bigint;
  v_memberships bigint;
  v_prepared_requests bigint;
  v_approved_references bigint;
  v_rls_disabled jsonb;
  v_tenant_tables jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.billing_internal_staff s
    where s.user_id=auth.uid() and s.is_active and s.staff_role='platform_admin'
  ) then
    raise exception 'Only an authorized Platform Admin may run the tenant audit'
      using errcode='42501';
  end if;

  select count(*) into v_total_companies from public.companies;
  select count(*) into v_memberships from public.company_members;

  select count(*) into v_missing_admin
  from public.companies c
  where not exists (
    select 1 from public.company_members m
    where m.company_id=c.id and m.role='admin'
  );

  select count(*) into v_multiple_admins
  from (
    select m.company_id
    from public.company_members m
    where m.role='admin'
    group by m.company_id
    having count(*)>1
  ) x;

  select count(*) into v_missing_activation
  from public.companies c
  where not exists (
    select 1 from public.billing_company_activation a where a.company_id=c.id
  );

  select count(*) into v_active_without_approval
  from public.company_subscriptions s
  left join public.billing_company_activation a on a.company_id=s.company_id
  where s.status in ('active','trialing')
    and coalesce(a.activation_status,'not_configured')<>'approved';

  select count(*) into v_prepared_requests
  from public.billing_sales_provisioning_requests r
  where r.status='approved_for_manual_setup' and r.activation_gate='blocked';

  select count(*) into v_approved_references
  from public.billing_sales_workspace_reconciliations x
  where x.status='approved_reference';

  -- A missing RLS flag is a review target, not proof of a data leak.
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'table',q.table_name,'rls_enabled',q.rls_enabled,'rls_forced',q.rls_forced
    )),'[]'::jsonb) into v_tenant_tables
  from (
    select c.relname as table_name,
           c.relrowsecurity as rls_enabled,
           c.relforcerowsecurity as rls_forced
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    join pg_catalog.pg_attribute a on a.attrelid=c.oid
      and a.attname='company_id' and a.attnum>0 and not a.attisdropped
    where n.nspname='public' and c.relkind in ('r','p')
    order by c.relname
    limit 250
  ) q;

  select coalesce(pg_catalog.jsonb_agg(t.table_name),'[]'::jsonb)
  into v_rls_disabled
  from pg_catalog.jsonb_to_recordset(v_tenant_tables)
       as t(table_name text,rls_enabled boolean,rls_forced boolean)
  where t.rls_enabled=false;

  return pg_catalog.jsonb_build_object(
    'audit_type','read_only_tenant_access_and_activation',
    'generated_at',now(),
    'total_companies',v_total_companies,
    'total_memberships',v_memberships,
    'companies_without_admin',v_missing_admin,
    'companies_with_multiple_admins_review',v_multiple_admins,
    'companies_without_activation_record',v_missing_activation,
    'active_or_trialing_subscriptions_without_activation_approval',
       v_active_without_approval,
    'approved_provisioning_requests_still_blocked',v_prepared_requests,
    'approved_workspace_references_not_linked',v_approved_references,
    'tenant_tables_with_company_id',v_tenant_tables,
    'tables_with_company_id_and_rls_disabled',v_rls_disabled,
    'legacy_company_setup_route_requires_application_review',true,
    'tenant_activation_enforcement_not_enabled',true,
    'automatically_activated_any_company',false,
    'note','Metadata and count audit only. RLS policies and API route authorization need separate verification.'
  );
end;
$$;

revoke all on function public.billing_internal_tenant_security_audit()
 from public,anon,authenticated;
grant execute on function public.billing_internal_tenant_security_audit()
 to authenticated;

-- Deliberately no SELECT execution: function is installed only.
-- A Platform Admin may later call SELECT public.billing_internal_tenant_security_audit();
commit;
