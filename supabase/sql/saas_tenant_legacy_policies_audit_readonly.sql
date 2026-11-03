-- Inspire Match ATS | Focused tenant isolation policy audit (READ ONLY)
-- Investigates permissive legacy policies and company setup. Makes no changes.
with policies as (
 select p.tablename,p.policyname,p.cmd,p.permissive,p.roles,p.qual,p.with_check
 from pg_catalog.pg_policies p
 where p.schemaname='public'
   and p.tablename in ('companies','company_members','candidates','jobs')
),
functions as (
 select p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
        p.prosecdef as security_definer,
        pg_catalog.pg_get_functiondef(p.oid) as definition
 from pg_catalog.pg_proc p
 join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
 and p.proname in ('is_company_member','is_company_admin','company_has_no_members',
                   'can_manage_recruitment_tasks')
)
select jsonb_pretty(jsonb_build_object(
 'audit','Legacy company setup and tenant isolation policy review',
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by tablename,policyname),'[]'::jsonb) from policies p),
 'membership_functions',(select coalesce(jsonb_agg(to_jsonb(f) order by proname),'[]'::jsonb) from functions f),
 'warning','Permissive policies combine with OR; an owner-only ALL policy can bypass more restrictive tenant checks.',
 'changes_made',false
)) as audit_result;
