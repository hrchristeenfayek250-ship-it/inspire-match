-- Inspire Match | Read-only tenant access and activation audit results
-- Run in Supabase SQL Editor (postgres context). No writes, policy changes or activation.
-- The previous migration installed an auth-gated RPC; this query deliberately
-- reads the database directly because SQL Editor sessions lack auth.uid().
with
company_metrics as (
 select jsonb_build_object(
  'total_companies',(select count(*) from public.companies),
  'total_memberships',(select count(*) from public.company_members),
  'companies_without_admin',(
    select count(*) from public.companies c
    where not exists(select 1 from public.company_members m
      where m.company_id=c.id and m.role='admin')),
  'companies_with_multiple_admins',(
    select count(*) from (
      select company_id from public.company_members
      where role='admin' group by company_id having count(*)>1
    ) x),
  'companies_without_activation_record',(
    select count(*) from public.companies c where not exists(
      select 1 from public.billing_company_activation a where a.company_id=c.id)),
  'active_or_trialing_without_approved_activation',(
    select count(*) from public.company_subscriptions s
    left join public.billing_company_activation a on a.company_id=s.company_id
    where s.status in ('active','trialing')
      and coalesce(a.activation_status,'not_configured') <> 'approved'),
  'approved_provisioning_still_blocked',(
    select count(*) from public.billing_sales_provisioning_requests
    where status='approved_for_manual_setup' and activation_gate='blocked'),
  'approved_reference_only_not_actual_link',(
    select count(*) from public.billing_sales_workspace_reconciliations
    where status='approved_reference'),
  'provisioning_requests_with_actual_company_link',(
    select count(*) from public.billing_sales_provisioning_requests
    where linked_company_id is not null)
 ) as metrics
),
tenant_tables as (
 select coalesce(jsonb_agg(jsonb_build_object(
    'table',rel.relname,
    'rls_enabled',rel.relrowsecurity,
    'rls_forced',rel.relforcerowsecurity,
    'policy_count',(select count(*) from pg_catalog.pg_policy p where p.polrelid=rel.oid)
 ) order by rel.relname),'[]'::jsonb) as items
 from pg_catalog.pg_class rel
 join pg_catalog.pg_namespace ns on ns.oid=rel.relnamespace
 where ns.nspname='public' and rel.relkind in ('r','p')
 and exists(select 1 from pg_catalog.pg_attribute a
   where a.attrelid=rel.oid and a.attname='company_id'
     and a.attnum>0 and not a.attisdropped)
),
sensitive_tables as (
 select coalesce(jsonb_agg(jsonb_build_object(
  'table',rel.relname,'rls_enabled',rel.relrowsecurity,
  'policy_count',(select count(*) from pg_catalog.pg_policy p where p.polrelid=rel.oid)
 ) order by rel.relname),'[]'::jsonb) as items
 from pg_catalog.pg_class rel
 join pg_catalog.pg_namespace ns on ns.oid=rel.relnamespace
 where ns.nspname='public' and rel.relkind in ('r','p') and rel.relname in (
  'companies','company_members','jobs','candidates','interviews',
  'billing_internal_staff','billing_sales_leads','billing_sales_proposals',
  'billing_sales_contracts','billing_sales_onboardings',
  'billing_sales_provisioning_requests','billing_sales_workspace_reconciliations',
  'billing_company_activation','company_subscriptions'
 )
)
select jsonb_pretty(jsonb_build_object(
 'audit','Tenant Access & Activation - SQL Editor read-only inspection',
 'generated_at',now(),
 'counts',(select metrics from company_metrics),
 'tables_with_company_id',(select items from tenant_tables),
 'key_tables',(select items from sensitive_tables),
 'important','RLS enabled/policies present does NOT prove policies are correct. Review of tenant access functions and client signup routes is a separate step.',
 'changes_made',false
)) as audit_result;
