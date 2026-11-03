-- Inspire Match ATS | Legacy self-service company creation exposure (READ ONLY)
-- This query does not modify tables, policies, users, or subscriptions.
with policies as (
 select tablename,policyname,cmd,permissive,roles,qual,with_check
 from pg_catalog.pg_policies
 where schemaname='public' and tablename in ('companies','company_members')
),
grants as (
 select table_name,grantee,privilege_type
 from information_schema.role_table_grants
 where table_schema='public'
 and table_name in ('companies','company_members')
 and grantee in ('anon','authenticated','service_role')
),
company_columns as (
 select table_name,column_name,data_type,is_nullable,column_default
 from information_schema.columns
 where table_schema='public'
 and table_name in ('companies','company_members')
),
triggers as (
 select event_object_table,trigger_name,event_manipulation,action_statement
 from information_schema.triggers
 where event_object_schema='public'
 and event_object_table in ('companies','company_members')
)
select jsonb_pretty(jsonb_build_object(
 'audit','Legacy company signup exposure: permissions, policies and triggers',
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by tablename,policyname),'[]'::jsonb) from policies p),
 'grants',(select coalesce(jsonb_agg(to_jsonb(g) order by table_name,grantee,privilege_type),'[]'::jsonb) from grants g),
 'columns',(select coalesce(jsonb_agg(to_jsonb(c) order by table_name,column_name),'[]'::jsonb) from company_columns c),
 'triggers',(select coalesce(jsonb_agg(to_jsonb(t) order by event_object_table,trigger_name),'[]'::jsonb) from triggers t),
 'note','Read-only evidence for a subsequent safe migration. No access restriction is applied here.',
 'changes_made',false
)) as audit_result;
