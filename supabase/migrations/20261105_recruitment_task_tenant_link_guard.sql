-- Inspire Match ATS: Tenant-safe Recruitment Task links.
-- Apply AFTER 20261029_team_task_assignment.sql and the stage-automation migrations.
-- Non-destructive: no existing tasks are modified or deleted.
-- Applies to newly inserted tasks and subsequent edits of their linked records.
BEGIN;

CREATE OR REPLACE FUNCTION public.validate_recruitment_task_links()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  -- Personal tasks may not point to tenant-owned jobs/candidates.
  IF NEW.company_id IS NULL THEN
    IF NEW.job_id IS NOT NULL OR NEW.candidate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Choose a company before linking a recruitment task to a job or candidate.';
    END IF;
    RETURN NEW;
  END IF;

  -- A link must always refer to an entity belonging to this same tenant.
  IF NEW.job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.jobs j
     WHERE j.id = NEW.job_id AND j.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Linked job does not belong to the task company.';
  END IF;

  IF NEW.candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.candidates c
     WHERE c.id = NEW.candidate_id AND c.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Linked candidate does not belong to the task company.';
  END IF;

  -- Multi-job candidates are supported: accept either their primary job
  -- or a real application for the linked company/job combination.
  IF NEW.job_id IS NOT NULL AND NEW.candidate_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.candidates c
       WHERE c.id = NEW.candidate_id
         AND c.company_id = NEW.company_id
         AND (
           c.job_id = NEW.job_id
           OR EXISTS (
             SELECT 1 FROM public.applications a
              WHERE a.candidate_id = c.id
                AND a.job_id = NEW.job_id
                AND a.company_id = NEW.company_id
           )
         )
    ) THEN
      RAISE EXCEPTION 'Candidate is not linked to the selected job in this company.';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_validate_recruitment_task_links
  ON public.recruitment_tasks;
CREATE TRIGGER trg_validate_recruitment_task_links
  BEFORE INSERT OR UPDATE OF company_id, job_id, candidate_id
  ON public.recruitment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_recruitment_task_links();

-- Trigger functions are not callable as standalone public APIs.
REVOKE ALL ON FUNCTION public.validate_recruitment_task_links()
  FROM PUBLIC, anon, authenticated;
COMMIT;
