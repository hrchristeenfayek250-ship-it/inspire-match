-- Recruiter-facing hiring manager feedback for the candidate's applications.
-- Review against live schema before applying. Read-only and tenant-scoped.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_candidate_hiring_manager_feedback(p_candidate_id uuid)
RETURNS TABLE (
 job_title text,
 candidate_stage text,
 recommendation text,
 rating integer,
 comments text,
 reviewed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT j.title::text,a.stage::text,r.recommendation::text,r.rating,
        r.comments::text,r.created_at
 FROM public.hiring_manager_candidate_reviews r
 JOIN public.hiring_manager_candidate_shares s ON s.id=r.share_id
 JOIN public.applications a ON a.id=s.application_id AND a.job_id=s.job_id AND a.company_id=s.company_id
 JOIN public.jobs j ON j.id=s.job_id AND j.company_id=s.company_id
 JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=s.company_id
 WHERE c.id=p_candidate_id AND s.revoked_at IS NULL
   AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id=s.company_id AND cm.user_id=(SELECT auth.uid())
      AND lower(cm.role::text) IN ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist')
   )
 ORDER BY r.created_at DESC;
$function$;
REVOKE ALL ON FUNCTION public.get_candidate_hiring_manager_feedback(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_candidate_hiring_manager_feedback(uuid) TO authenticated;
COMMIT;
