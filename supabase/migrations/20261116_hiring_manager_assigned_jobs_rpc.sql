-- Inspire Match ATS: secure hiring-manager assigned jobs read model.
-- No salary/compensation, candidate, or confidential offers fields are returned.
-- Apply through Supabase migrations after verifying jobs.hiring_manager_user_id exists.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_hiring_manager_jobs()
RETURNS TABLE (
  job_id bigint,
  job_title text,
  department text,
  job_status text,
  location text,
  priority text,
  hiring_deadline text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    j.id AS job_id,
    j.title::text AS job_title,
    j.department::text,
    j.status::text AS job_status,
    j.location::text,
    j.priority::text,
    j.deadline::text AS hiring_deadline
  FROM public.jobs AS j
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND j.hiring_manager_user_id = (SELECT auth.uid())
    AND j.company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.company_members AS cm
      WHERE cm.company_id = j.company_id
        AND cm.user_id = (SELECT auth.uid())
        AND lower(cm.role::text) = 'hiring_manager'
    )
  ORDER BY j.created_at DESC NULLS LAST, j.id;
$function$;

REVOKE ALL ON FUNCTION public.get_my_hiring_manager_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hiring_manager_jobs() TO authenticated;

COMMIT;

-- Explicit verification: returned fields are non-financial. Admin/HR manager
-- design previews intentionally do not receive someone else's assigned jobs.
SELECT pg_get_function_result(p.oid) AS return_signature,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anonymous_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname='get_my_hiring_manager_jobs';
