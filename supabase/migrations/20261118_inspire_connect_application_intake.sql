-- Secure, staged public career applications (not direct candidate writes).
-- Deployment also requires server-only SUPABASE_SERVICE_ROLE_KEY.
BEGIN;
CREATE TABLE IF NOT EXISTS public.inspire_career_applications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 company_id uuid NOT NULL,
 job_id bigint NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
 full_name text NOT NULL CHECK(length(full_name) BETWEEN 2 AND 160),
 email text NOT NULL CHECK(length(email) BETWEEN 5 AND 254),
 phone text,
 cv_path text NOT NULL,
 cv_filename text NOT NULL,
 consent_confirmed boolean NOT NULL DEFAULT false,
 source text NOT NULL DEFAULT 'Career Page',
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','imported','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inspire_career_applications_company_created_idx ON public.inspire_career_applications(company_id,created_at DESC);
ALTER TABLE public.inspire_career_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspire_career_applications FROM PUBLIC,anon,authenticated;
-- Admin/HR manager read only; public intake happens solely via private server route.
CREATE POLICY inspire_career_applications_hr_read ON public.inspire_career_applications
 FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.company_members cm WHERE cm.company_id=inspire_career_applications.company_id AND cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text) IN ('admin','hr_manager'))
 );
GRANT SELECT ON public.inspire_career_applications TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('inspire-career-cvs','inspire-career-cvs',false,5242880,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT(id) DO NOTHING;
COMMIT;