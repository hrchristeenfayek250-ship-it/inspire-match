-- Inspire Match | Stage 2: inspect tenant security policies and RPC exposure (READ ONLY)
-- Execute in Supabase SQL Editor. No settings, RLS policies, grants, or data are changed.
with tenant_policies as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', p.tablename,
    'policy', p.policyname,
    'command', p.cmd,
    'roles', p.roles,
    'using', p.qual,
    'check', p.with_check
  ) order by p.tablename, p.policyname), '[]'::jsonb) as rows
  from pg_catalog.pg_policies p
  where p.schemaname='public' and p.tablename in (
    'companies','company_members','company_invitations',
    'jobs','candidates','applications','interviews',
    'billing_company_activation','company_subscriptions',
    'billing_internal_staff','billing_sales_contracts',
    'billing_sales_onboardings','billing_sales_provisioning_requests',
    'billing_sales_workspace_reconciliations'
  )
),
tenant_grants as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'table', table_name, 'grantee', grantee,
    'privilege', privilege_type
  ) order by table_name, grantee, privilege_type),'[]'::jsonb) as rows
  from information_schema.role_table_grants
  where table_schema='public'
    and grantee in ('anon','authenticated','service_role')
    and table_name in (
      'companies','company_members','company_invitations',
      'jobs','candidates','applications','interviews',
      'billing_company_activation','company_subscriptions',
      'billing_internal_staff','billing_sales_provisioning_requests',
      'billing_sales_workspace_reconciliations'
    )
),
rpc_exposure as (
 select coalesce(jsonb_agg(jsonb_build_object(
    'function',p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
    'security_definer',p.prosecdef,
    'anon_execute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
    'authenticated_execute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) order by p.proname),'[]'::jsonb) as rows
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and (
    p.proname like 'billing_sales_%'
    or p.proname like 'billing_internal_%'
    or p.proname like 'billing_my_%'
    or p.proname in ('billing_start_checkout','billing_is_internal_staff')
  )
)
select jsonb_pretty(jsonb_build_object(
 'audit','Tenant security policies, grants and callable RPCs - read only',
 'generated_at', now(),
 'rls_policies',(select rows from tenant_policies),
 'table_grants',(select rows from tenant_grants),
 'rpc_exposure',(select rows from rpc_exposure),
 'application_routes_not_audited',true,
 'changes_made',false
)) as audit_result;
