-- Read-only, share-scoped candidate profile. Never return compensation or contact details.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_my_hiring_candidate_profile(p_share_id uuid)
RETURNS TABLE (
 candidate_name text, current_title text, location text, years_experience text,
 professional_summary text, skills text, job_title text, candidate_stage text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT c.full_name::text,c.current_title::text,c.location::text,c.years_experience::text,
        c.professional_summary::text,c.skills::text,j.title::text,a.stage::text
 FROM public.hiring_manager_candidate_shares s
 JOIN public.jobs j ON j.id=s.job_id AND j.company_id=s.company_id
 JOIN public.applications a ON a.id=s.application_id AND a.job_id=j.id
 JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=s.company_id
 WHERE s.id=p_share_id AND s.revoked_at IS NULL
   AND s.hiring_manager_id=(SELECT auth.uid())
   AND j.hiring_manager_user_id=(SELECT auth.uid())
   AND EXISTS (SELECT 1 FROM public.company_members cm
     WHERE cm.company_id=s.company_id AND cm.user_id=(SELECT auth.uid())
       AND lower(cm.role::text)='hiring_manager');
$function$;
REVOKE ALL ON FUNCTION public.get_my_hiring_candidate_profile(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_hiring_candidate_profile(uuid) TO authenticated;
COMMIT;
