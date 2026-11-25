-- Atomic import of career applications into the recruitment pipeline.
-- Run in Supabase SQL Editor before deploying the import action.
BEGIN;
ALTER TABLE public.inspire_career_applications
  ADD COLUMN IF NOT EXISTS imported_candidate_id bigint REFERENCES public.candidates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS inspire_career_apps_imported_candidate_idx ON public.inspire_career_applications(imported_candidate_id);

CREATE OR REPLACE FUNCTION public.import_inspire_career_application(
  p_application_id bigint,
  p_company_id uuid,
  p_actor_id uuid,
  p_cv_file_path text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_app public.inspire_career_applications%ROWTYPE;
 v_candidate_id bigint;
 v_created boolean:=false;
BEGIN
 -- EXECUTE is granted exclusively to service_role; the function runs as its owner.
 SELECT * INTO v_app FROM public.inspire_career_applications
 WHERE id=p_application_id AND company_id=p_company_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 IF v_app.status='imported' THEN
   RETURN jsonb_build_object('candidate_id',v_app.imported_candidate_id,'already_imported',true,'created',false);
 END IF;
 -- Serialize imports for the same company/email across separate application rows.
 PERFORM pg_advisory_xact_lock(hashtext(p_company_id::text),hashtext(lower(trim(v_app.email))));
 SELECT id INTO v_candidate_id FROM public.candidates
 WHERE company_id=p_company_id AND lower(trim(email))=lower(trim(v_app.email))
 ORDER BY id ASC LIMIT 1;
 IF v_candidate_id IS NULL THEN
   IF p_cv_file_path IS NULL OR p_cv_file_path='' THEN
     RAISE EXCEPTION 'CV file path required';
   END IF;
   INSERT INTO public.candidates
     (user_id,company_id,job_id,full_name,email,phone,cv_file_name,cv_file_url,status,source,consent_confirmed)
   VALUES
     (p_actor_id,p_company_id,v_app.job_id,v_app.full_name,lower(trim(v_app.email)),v_app.phone,
      v_app.cv_filename,p_cv_file_path,'Applied','Career Page',v_app.consent_confirmed)
   RETURNING id INTO v_candidate_id;
   v_created:=true;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.applications WHERE company_id=p_company_id AND candidate_id=v_candidate_id AND job_id=v_app.job_id) THEN
   INSERT INTO public.applications(company_id,candidate_id,job_id,user_id,stage)
   VALUES(p_company_id,v_candidate_id,v_app.job_id,p_actor_id,'Applied');
 END IF;
 UPDATE public.inspire_career_applications
 SET status='imported',imported_candidate_id=v_candidate_id
 WHERE id=v_app.id;
 RETURN jsonb_build_object('candidate_id',v_candidate_id,'already_imported',false,'created',v_created);
END;
$$;
REVOKE ALL ON FUNCTION public.import_inspire_career_application(bigint,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_inspire_career_application(bigint,uuid,uuid,text) TO service_role;
COMMIT;
