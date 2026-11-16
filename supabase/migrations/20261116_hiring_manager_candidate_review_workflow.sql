-- Hiring Manager workflow: approved candidate sharing, reviews and audit trail.
-- Deploy together with 20261116_hiring_manager_assigned_jobs_rpc.sql.
-- IMPORTANT: Run only after confirming existing jobs, applications, candidates, company_members schema.
BEGIN;
CREATE TABLE IF NOT EXISTS public.hiring_manager_candidate_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
 application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
 hiring_manager_id uuid NOT NULL REFERENCES auth.users(id),
 shared_by uuid NOT NULL REFERENCES auth.users(id),
 shared_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 UNIQUE(job_id,application_id,hiring_manager_id)
);
CREATE TABLE IF NOT EXISTS public.hiring_manager_candidate_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 share_id uuid NOT NULL REFERENCES public.hiring_manager_candidate_shares(id) ON DELETE CASCADE,
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 recommendation text NOT NULL CHECK (recommendation IN ('proceed','hold','reject')),
 rating integer CHECK (rating BETWEEN 1 AND 5),
 comments text NOT NULL CHECK (char_length(trim(comments)) BETWEEN 10 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hm_shares_member_idx ON public.hiring_manager_candidate_shares(hiring_manager_id,company_id,revoked_at);
CREATE INDEX IF NOT EXISTS hm_reviews_share_idx ON public.hiring_manager_candidate_reviews(share_id,created_at DESC);
ALTER TABLE public.hiring_manager_candidate_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_manager_candidate_reviews ENABLE ROW LEVEL SECURITY;
-- All access through narrowly scoped SECURITY DEFINER RPCs; no direct table grants.
REVOKE ALL ON public.hiring_manager_candidate_shares FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.hiring_manager_candidate_reviews FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_my_hiring_candidate_reviews()
RETURNS TABLE (
 share_id uuid, application_id uuid, job_id uuid, job_title text,
 candidate_name text, candidate_title text, candidate_stage text,
 shared_at timestamptz, latest_recommendation text, latest_rating integer,
 latest_comments text, reviewed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
 SELECT s.id,a.id,j.id,j.title::text,c.full_name::text,c.current_title::text,a.stage::text,
   s.shared_at,r.recommendation::text,r.rating,r.comments::text,r.created_at
 FROM public.hiring_manager_candidate_shares s
 JOIN public.jobs j ON j.id=s.job_id AND j.company_id=s.company_id
 JOIN public.applications a ON a.id=s.application_id AND a.job_id=j.id AND a.company_id=s.company_id
 JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=s.company_id
 JOIN public.company_members cm ON cm.company_id=s.company_id
  AND cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text)='hiring_manager'
 LEFT JOIN LATERAL (
   SELECT recommendation,rating,comments,created_at FROM public.hiring_manager_candidate_reviews
   WHERE share_id=s.id ORDER BY created_at DESC LIMIT 1
 ) r ON true
 WHERE s.hiring_manager_id=(SELECT auth.uid()) AND s.revoked_at IS NULL
   AND j.hiring_manager_user_id=(SELECT auth.uid())
 ORDER BY s.shared_at DESC,s.id;
$function$;

CREATE OR REPLACE FUNCTION public.submit_hiring_candidate_review(
 p_share_id uuid,p_recommendation text,p_rating integer,p_comments text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_id uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_recommendation NOT IN ('proceed','hold','reject')
   OR p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5
   OR length(trim(coalesce(p_comments,''))) NOT BETWEEN 10 AND 5000
 THEN RAISE EXCEPTION 'Invalid evaluation. Choose a decision, rate 1-5, and write at least 10 characters.'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.hiring_manager_candidate_shares s
  JOIN public.jobs j ON j.id=s.job_id AND j.company_id=s.company_id
  JOIN public.company_members cm ON cm.company_id=s.company_id
   AND cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text)='hiring_manager'
  WHERE s.id=p_share_id AND s.revoked_at IS NULL
    AND s.hiring_manager_id=(SELECT auth.uid())
    AND j.hiring_manager_user_id=(SELECT auth.uid())
 ) THEN RAISE EXCEPTION 'Candidate is not shared with you'; END IF;
 INSERT INTO public.hiring_manager_candidate_reviews(share_id,reviewer_id,recommendation,rating,comments)
 VALUES (p_share_id,(SELECT auth.uid()),p_recommendation,p_rating,trim(p_comments))
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.share_candidate_with_hiring_manager(
 p_application_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_id uuid; v_company uuid; v_job uuid; v_manager uuid;
BEGIN
 SELECT j.company_id,j.id,j.hiring_manager_user_id INTO v_company,v_job,v_manager
 FROM public.applications a JOIN public.jobs j ON j.id=a.job_id AND j.company_id=a.company_id
 JOIN public.candidates c ON c.id=a.candidate_id AND c.company_id=j.company_id
 WHERE a.id=p_application_id;
 IF v_company IS NULL OR v_manager IS NULL THEN RAISE EXCEPTION 'Job, application or assigned hiring manager not found'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.company_members cm WHERE cm.company_id=v_company
   AND cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text) IN
   ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist')
 ) THEN RAISE EXCEPTION 'Recruiter permission required'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.company_members cm WHERE cm.company_id=v_company
   AND cm.user_id=v_manager AND lower(cm.role::text)='hiring_manager'
 ) THEN RAISE EXCEPTION 'Assigned manager is not an authorized member'; END IF;
 INSERT INTO public.hiring_manager_candidate_shares(company_id,job_id,application_id,hiring_manager_id,shared_by)
 VALUES(v_company,v_job,p_application_id,v_manager,(SELECT auth.uid()))
 ON CONFLICT (job_id,application_id,hiring_manager_id)
 DO UPDATE SET revoked_at=NULL,shared_by=EXCLUDED.shared_by,shared_at=now()
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_hiring_candidate_reviews() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.submit_hiring_candidate_review(uuid,text,integer,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.share_candidate_with_hiring_manager(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_hiring_candidate_reviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_hiring_candidate_review(uuid,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_candidate_with_hiring_manager(uuid) TO authenticated;
COMMIT;
