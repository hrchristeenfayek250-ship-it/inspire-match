-- Recruiter control of Hiring Manager shares: list and revoke.
-- Apply AFTER 20261116_hiring_manager_candidate_review_workflow.sql.
-- Review against production schema before execution.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_candidate_hiring_manager_shares(p_candidate_id bigint)
RETURNS TABLE (
 share_id uuid, application_id bigint, job_id bigint, hiring_manager_id uuid,
 shared_at timestamptz, revoked_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT s.id,s.application_id,s.job_id,s.hiring_manager_id,s.shared_at,s.revoked_at
 FROM public.hiring_manager_candidate_shares s
 JOIN public.applications a ON a.id=s.application_id AND a.job_id=s.job_id AND a.company_id=s.company_id
 JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=s.company_id
 WHERE a.candidate_id=p_candidate_id
 AND EXISTS (
  SELECT 1 FROM public.company_members cm
  WHERE cm.company_id=s.company_id AND cm.user_id=(SELECT auth.uid())
   AND lower(cm.role::text) IN ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist')
 )
 ORDER BY s.shared_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_candidate_hiring_manager_share(p_share_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_count integer;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 UPDATE public.hiring_manager_candidate_shares s
 SET revoked_at=now()
 WHERE s.id=p_share_id AND s.revoked_at IS NULL
 AND EXISTS (
  SELECT 1 FROM public.applications a
  JOIN public.jobs j ON j.id=a.job_id AND j.company_id=a.company_id
  JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=a.company_id
  JOIN public.company_members cm ON cm.company_id=a.company_id AND cm.user_id=(SELECT auth.uid())
  WHERE a.id=s.application_id AND a.job_id=s.job_id AND a.company_id=s.company_id
   AND lower(cm.role::text) IN ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist')
 );
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count=0 THEN RAISE EXCEPTION 'Active share not found or permission denied'; END IF;
 RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_candidate_hiring_manager_shares(bigint) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.revoke_candidate_hiring_manager_share(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_candidate_hiring_manager_shares(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_candidate_hiring_manager_share(uuid) TO authenticated;
COMMIT;
