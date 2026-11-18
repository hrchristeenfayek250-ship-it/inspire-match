-- READ-ONLY preflight: run in Supabase SQL Editor BEFORE applying Hiring Manager migrations.
-- Zero DDL/DML. Every returned row is a missing dependency that must be resolved.
WITH required_columns(table_name,column_name) AS (
 VALUES
 ('jobs','id'),('jobs','company_id'),('jobs','title'),('jobs','status'),
 ('jobs','department'),('jobs','location'),('jobs','priority'),('jobs','deadline'),
 ('jobs','created_at'),('jobs','hiring_manager_user_id'),
 ('applications','id'),('applications','job_id'),('applications','candidate_id'),
 ('applications','company_id'),('applications','stage'),
 ('candidates','id'),('candidates','company_id'),('candidates','full_name'),
 ('candidates','current_title'),('candidates','location'),('candidates','years_experience'),
 ('candidates','professional_summary'),('candidates','skills'),
 ('company_members','company_id'),('company_members','user_id'),('company_members','role')
),
missing_columns AS (
 SELECT 'missing column'::text AS issue, r.table_name||'.'||r.column_name AS dependency
 FROM required_columns r
 LEFT JOIN information_schema.columns c ON c.table_schema='public'
  AND c.table_name=r.table_name AND c.column_name=r.column_name
 WHERE c.column_name IS NULL
),
required_functions(signature) AS (
 VALUES ('auth.uid()')
),
missing_functions AS (
 SELECT 'missing function'::text AS issue, signature AS dependency
 FROM required_functions WHERE to_regprocedure(signature) IS NULL
)
SELECT issue,dependency FROM missing_columns
UNION ALL SELECT issue,dependency FROM missing_functions
ORDER BY issue,dependency;

-- After deployment, check SECURITY DEFINER RPC execution grants and signatures:
SELECT n.nspname||'.'||p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS returns,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
 'get_my_hiring_manager_jobs','get_my_hiring_candidate_reviews',
 'get_my_hiring_candidate_profile','submit_hiring_candidate_review',
 'share_candidate_with_hiring_manager','get_candidate_hiring_manager_feedback',
 'get_candidate_hiring_manager_shares','revoke_candidate_hiring_manager_share')
ORDER BY function_name;
