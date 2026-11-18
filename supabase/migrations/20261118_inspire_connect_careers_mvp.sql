-- Inspire Connect MVP: separate, opt-in public Career Pages and private applicant inbox.
-- Review and apply ONLY after confirming jobs.id bigint, company_id uuid, company_members.
-- No modifications to jobs, candidates, applications, or billing tables.
BEGIN;

CREATE TABLE IF NOT EXISTS public.inspire_connect_sites (
  company_id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 120),
  headline text NOT NULL DEFAULT 'Build your future with us',
  is_live boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspire_connect_job_posts (
  company_id uuid NOT NULL,
  job_id bigint NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  PRIMARY KEY (company_id,job_id),
  FOREIGN KEY (company_id) REFERENCES public.inspire_connect_sites(company_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.inspire_connect_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.inspire_connect_sites(company_id),
  job_id bigint NOT NULL REFERENCES public.jobs(id),
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 160),
  email text NOT NULL CHECK (length(email) BETWEEN 5 AND 254),
  phone text CHECK (phone IS NULL OR length(phone) <= 40),
  cv_link text CHECK (cv_link IS NULL OR length(cv_link) <= 2048),
  cover_note text CHECK (cover_note IS NULL OR length(cover_note) <= 4000),
  source text NOT NULL CHECK (source IN ('career_page','linkedin','facebook','instagram','referral','email','other')),
  campaign text CHECK (campaign IS NULL OR length(campaign) <= 120),
  consent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inspire_connect_unique_application
ON public.inspire_connect_applicants (job_id,lower(email));
CREATE INDEX IF NOT EXISTS inspire_connect_inbox_company
ON public.inspire_connect_applicants (company_id,created_at DESC);

ALTER TABLE public.inspire_connect_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspire_connect_job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspire_connect_applicants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspire_connect_sites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.inspire_connect_job_posts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.inspire_connect_applicants FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.connect_my_company()
RETURNS TABLE (company_id uuid,slug text,display_name text,headline text,is_live boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT s.company_id,s.slug,s.display_name,s.headline,s.is_live
 FROM public.inspire_connect_sites s
 WHERE EXISTS (SELECT 1 FROM public.company_members m WHERE m.company_id=s.company_id
 AND m.user_id=(SELECT auth.uid()) AND lower(m.role::text) IN
 ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist'))
$$;

CREATE OR REPLACE FUNCTION public.connect_save_site(
 p_slug text,p_display_name text,p_headline text,p_is_live boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_company uuid;
BEGIN
 SELECT m.company_id INTO STRICT v_company FROM public.company_members m
 WHERE m.user_id=(SELECT auth.uid())
 AND lower(m.role::text) IN ('admin','hr_manager');
 IF p_slug IS NULL OR p_slug !~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'
 OR length(trim(coalesce(p_display_name,''))) NOT BETWEEN 2 AND 120
 OR length(coalesce(p_headline,'')) > 200 THEN
  RAISE EXCEPTION 'Invalid career site settings';
 END IF;
 INSERT INTO public.inspire_connect_sites(company_id,slug,display_name,headline,is_live)
 VALUES(v_company,p_slug,trim(p_display_name),coalesce(nullif(trim(p_headline),''),'Build your future with us'),p_is_live)
 ON CONFLICT(company_id) DO UPDATE SET
 slug=excluded.slug,display_name=excluded.display_name,
 headline=excluded.headline,is_live=excluded.is_live;
 RETURN true;
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
 RAISE EXCEPTION 'An authorized HR Manager membership is required';
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_my_jobs()
RETURNS TABLE(job_id bigint,job_title text,job_status text,is_published boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT j.id,j.title::text,j.status::text,coalesce(p.is_published,false)
 FROM public.jobs j
 JOIN public.company_members m ON m.company_id=j.company_id
  AND m.user_id=(SELECT auth.uid()) AND lower(m.role::text) IN
  ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist')
 LEFT JOIN public.inspire_connect_job_posts p ON p.job_id=j.id AND p.company_id=j.company_id
 ORDER BY j.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.connect_publish_job(p_job_id bigint,p_publish boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_company uuid;
BEGIN
 SELECT j.company_id INTO STRICT v_company FROM public.jobs j
 JOIN public.company_members m ON m.company_id=j.company_id
 AND m.user_id=(SELECT auth.uid()) AND lower(m.role::text) IN ('admin','hr_manager')
 WHERE j.id=p_job_id;
 IF NOT EXISTS(SELECT 1 FROM public.inspire_connect_sites s WHERE s.company_id=v_company)
 THEN RAISE EXCEPTION 'Create a career site first'; END IF;
 INSERT INTO public.inspire_connect_job_posts(company_id,job_id,is_published,published_at)
 VALUES(v_company,p_job_id,p_publish,CASE WHEN p_publish THEN now() ELSE NULL END)
 ON CONFLICT(company_id,job_id) DO UPDATE SET
 is_published=excluded.is_published,published_at=excluded.published_at;
 RETURN true;
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
 RAISE EXCEPTION 'Job not found or insufficient publishing permission';
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_public_site(p_slug text)
RETURNS TABLE(display_name text,headline text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT s.display_name,s.headline FROM public.inspire_connect_sites s
 WHERE s.slug=p_slug AND s.is_live=true
$$;

CREATE OR REPLACE FUNCTION public.connect_public_jobs(p_slug text)
RETURNS TABLE(job_id bigint,title text,department text,location text,work_type text,employment_type text,description text,requirements text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT j.id,j.title::text,j.department::text,j.location::text,j.work_type::text,
 j.employment_type::text,j.description::text,j.requirements::text
 FROM public.inspire_connect_sites s
 JOIN public.inspire_connect_job_posts p ON p.company_id=s.company_id AND p.is_published=true
 JOIN public.jobs j ON j.id=p.job_id AND j.company_id=s.company_id
 WHERE s.slug=p_slug AND s.is_live=true AND lower(j.status::text)='active'
 ORDER BY p.published_at DESC NULLS LAST,j.id DESC
$$;

CREATE OR REPLACE FUNCTION public.connect_apply(
 p_slug text,p_job_id bigint,p_full_name text,p_email text,p_phone text,
 p_cv_link text,p_cover_note text,p_source text,p_campaign text,
 p_consent boolean,p_honeypot text DEFAULT ''
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_company uuid; v_email text; v_source text;
BEGIN
 -- Honeypot always returns a generic success to discourage automated retries.
 IF length(coalesce(p_honeypot,'')) > 0 THEN RETURN true; END IF;
 v_email=lower(trim(coalesce(p_email,'')));
 v_source=lower(trim(coalesce(p_source,'')));
 IF p_consent IS DISTINCT FROM true
 OR length(trim(coalesce(p_full_name,''))) NOT BETWEEN 2 AND 160
 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
 OR length(v_email)>254
 OR length(coalesce(p_phone,''))>40
 OR length(coalesce(p_cover_note,''))>4000
 OR length(coalesce(p_campaign,''))>120
 OR (nullif(trim(coalesce(p_cv_link,'')),'') IS NOT NULL AND
  (length(p_cv_link)>2048 OR p_cv_link !~* '^https://[^[:space:]]+$'))
 OR v_source NOT IN ('career_page','linkedin','facebook','instagram','referral','email','other')
 THEN RAISE EXCEPTION 'Please check the application details and consent'; END IF;
 SELECT s.company_id INTO v_company
 FROM public.inspire_connect_sites s
 JOIN public.inspire_connect_job_posts p ON p.company_id=s.company_id
 JOIN public.jobs j ON j.id=p.job_id AND j.company_id=s.company_id
 WHERE s.slug=p_slug AND s.is_live=true AND p.is_published=true
 AND j.id=p_job_id AND lower(j.status::text)='active';
 IF v_company IS NULL THEN RAISE EXCEPTION 'This position is no longer open for applications'; END IF;
 INSERT INTO public.inspire_connect_applicants
 (company_id,job_id,full_name,email,phone,cv_link,cover_note,source,campaign)
 VALUES(v_company,p_job_id,trim(p_full_name),v_email,nullif(trim(p_phone),''),
 nullif(trim(p_cv_link),''),nullif(trim(p_cover_note),''),v_source,nullif(trim(p_campaign),''))
 ON CONFLICT DO NOTHING;
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.connect_my_applications()
RETURNS TABLE(id uuid,job_id bigint,job_title text,full_name text,email text,phone text,
 cv_link text,cover_note text,source text,campaign text,created_at timestamptz,status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT a.id,a.job_id,j.title::text,a.full_name,a.email,a.phone,
 a.cv_link,a.cover_note,a.source,a.campaign,a.created_at,a.status
 FROM public.inspire_connect_applicants a
 JOIN public.jobs j ON j.id=a.job_id AND j.company_id=a.company_id
 WHERE EXISTS(SELECT 1 FROM public.company_members m
 WHERE m.company_id=a.company_id AND m.user_id=(SELECT auth.uid())
 AND lower(m.role::text) IN ('admin','hr_manager','senior_recruiter','hr','recruiter','hr_specialist'))
 ORDER BY a.created_at DESC
 LIMIT 500
$$;

REVOKE ALL ON FUNCTION public.connect_my_company() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.connect_save_site(text,text,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.connect_my_jobs() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.connect_publish_job(bigint,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.connect_my_applications() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.connect_my_company() TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_save_site(text,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_my_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_publish_job(bigint,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connect_my_applications() TO authenticated;

REVOKE ALL ON FUNCTION public.connect_public_site(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_public_jobs(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.connect_apply(text,bigint,text,text,text,text,text,text,text,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.connect_public_site(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.connect_public_jobs(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.connect_apply(text,bigint,text,text,text,text,text,text,text,boolean,text) TO anon,authenticated;
COMMIT;
