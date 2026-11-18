-- Inspire Match ATS | Hiring Manager assigned job summary (non-financial).
-- Apply manually after reviewing against the current production schema.
-- Read-only; access is limited to the logged-in hiring_manager assigned to the job.
-- No salary, benefits, compensation, or candidate data is returned.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_my_hiring_manager_jobs()
RETURNS TABLE (
  job_id uuid,
  job_title text,
  job_status text,
  department text,
  job_location text,
  priority text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    j.id,
    j.title::text,
    j.status::text,
    j.department::text,
    j.location::text,
    j.priority::text
  FROM public.jobs AS j
  INNER JOIN public.company_members AS cm
    ON cm.company_id = j.company_id
   AND cm.user_id = (SELECT auth.uid())
   AND cm.role = 'hiring_manager'
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND j.hiring_manager_user_id = (SELECT auth.uid())
  ORDER BY j.created_at DESC;
$function$;
REVOKE ALL ON FUNCTION public.get_my_hiring_manager_jobs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hiring_manager_jobs() TO authenticated;
COMMIT;
-- Verification: assigned HM sees only their own jobs; another company/user gets none.
-- This function is a summary, not a job-approval workflow.
