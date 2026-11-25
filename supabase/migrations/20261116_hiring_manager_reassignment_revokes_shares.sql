-- Revoke previously shared candidates automatically when a job is reassigned.
-- Apply after 20261116_hiring_manager_candidate_review_workflow.sql.
-- Existing review history is retained for authorized recruiters; access for the old manager ends.
BEGIN;
CREATE OR REPLACE FUNCTION public.revoke_hiring_manager_shares_on_job_reassignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
BEGIN
 IF OLD.hiring_manager_user_id IS DISTINCT FROM NEW.hiring_manager_user_id
    OR OLD.company_id IS DISTINCT FROM NEW.company_id THEN
   UPDATE public.hiring_manager_candidate_shares
      SET revoked_at=now()
    WHERE job_id=OLD.id AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_revoke_hm_shares_on_job_reassignment ON public.jobs;
CREATE TRIGGER trg_revoke_hm_shares_on_job_reassignment
AFTER UPDATE OF hiring_manager_user_id,company_id ON public.jobs
FOR EACH ROW
WHEN (OLD.hiring_manager_user_id IS DISTINCT FROM NEW.hiring_manager_user_id
      OR OLD.company_id IS DISTINCT FROM NEW.company_id)
EXECUTE FUNCTION public.revoke_hiring_manager_shares_on_job_reassignment();
REVOKE ALL ON FUNCTION public.revoke_hiring_manager_shares_on_job_reassignment() FROM PUBLIC,anon,authenticated;
COMMIT;
