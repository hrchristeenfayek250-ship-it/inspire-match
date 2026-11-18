-- Inspire Connect: opt-in company career pages. No job becomes public automatically.
-- Public RPC returns only whitelisted job fields. No salaries or candidate records.
BEGIN;
CREATE TABLE IF NOT EXISTS public.inspire_career_sites (
 company_id uuid PRIMARY KEY,
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
 display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
 is_live boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inspire_career_job_posts (
 job_id bigint PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
 company_id uuid NOT NULL,
 published boolean NOT NULL DEFAULT false,
 published_at timestamptz,
 CHECK (published = false OR published_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS inspire_career_job_company_idx ON public.inspire_career_job_posts(company_id,published);
ALTER TABLE public.inspire_career_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspire_career_job_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspire_career_sites FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.inspire_career_job_posts FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.manage_inspire_career_site(
 p_slug text, p_display_name text, p_is_live boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_company uuid;
BEGIN
 SELECT cm.company_id INTO STRICT v_company FROM public.company_members cm
 WHERE cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text) IN ('admin','hr_manager');
 IF p_slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' OR char_length(trim(p_display_name)) NOT BETWEEN 2 AND 120
 THEN RAISE EXCEPTION 'Invalid career site settings'; END IF;
 INSERT INTO public.inspire_career_sites(company_id,slug,display_name,is_live)
 VALUES(v_company,p_slug,trim(p_display_name),p_is_live)
 ON CONFLICT(company_id) DO UPDATE SET slug=EXCLUDED.slug,display_name=EXCLUDED.display_name,is_live=EXCLUDED.is_live;
END;$fn$;

CREATE OR REPLACE FUNCTION public.set_inspire_career_job_publication(p_job_id bigint,p_published boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE v_company uuid;
BEGIN
 SELECT j.company_id INTO STRICT v_company FROM public.jobs j
 JOIN public.company_members cm ON cm.company_id=j.company_id
 WHERE j.id=p_job_id AND cm.user_id=(SELECT auth.uid())
 AND lower(cm.role::text) IN ('admin','hr_manager');
 INSERT INTO public.inspire_career_job_posts(job_id,company_id,published,published_at)
 VALUES(p_job_id,v_company,p_published,CASE WHEN p_published THEN now() ELSE NULL END)
 ON CONFLICT(job_id) DO UPDATE SET
 published=EXCLUDED.published,
 published_at=EXCLUDED.published_at,
 company_id=EXCLUDED.company_id;
END;$fn$;

CREATE OR REPLACE FUNCTION public.get_my_inspire_career_settings()
RETURNS TABLE(company_id uuid,slug text,display_name text,is_live boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT s.company_id,s.slug,s.display_name,s.is_live
 FROM public.inspire_career_sites s JOIN public.company_members cm ON cm.company_id=s.company_id
 WHERE cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text) IN ('admin','hr_manager');
$fn$;

CREATE OR REPLACE FUNCTION public.get_my_inspire_career_jobs()
RETURNS TABLE(job_id bigint,job_title text,published boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT j.id,j.title::text,coalesce(p.published,false)
 FROM public.jobs j JOIN public.company_members cm ON cm.company_id=j.company_id
 LEFT JOIN public.inspire_career_job_posts p ON p.job_id=j.id AND p.company_id=j.company_id
 WHERE cm.user_id=(SELECT auth.uid()) AND lower(cm.role::text) IN ('admin','hr_manager')
 ORDER BY j.id DESC;
$fn$;

CREATE OR REPLACE FUNCTION public.get_public_inspire_career_site(p_slug text)
RETURNS TABLE(display_name text,job_id bigint,job_title text,department text,location text,work_type text,employment_type text,description text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT s.display_name,j.id,j.title::text,j.department::text,j.location::text,
 j.work_type::text,j.employment_type::text,j.description::text
 FROM public.inspire_career_sites s
 JOIN public.inspire_career_job_posts p ON p.company_id=s.company_id AND p.published=true
 JOIN public.jobs j ON j.id=p.job_id AND j.company_id=s.company_id
 WHERE s.slug=p_slug AND s.is_live=true
 ORDER BY p.published_at DESC,j.id DESC;
$fn$;
REVOKE ALL ON FUNCTION public.manage_inspire_career_site(text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_inspire_career_job_publication(bigint,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_my_inspire_career_settings() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_my_inspire_career_jobs() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_public_inspire_career_site(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_inspire_career_site(text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_inspire_career_job_publication(bigint,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_inspire_career_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_inspire_career_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_inspire_career_site(text) TO anon,authenticated;
COMMIT;
