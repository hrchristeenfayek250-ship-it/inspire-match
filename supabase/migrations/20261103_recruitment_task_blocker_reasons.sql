-- Inspire Match ATS: structured blocker reasons for task SLA diagnostics.
-- Run once in Supabase SQL Editor before enabling blocker-reason UI.
BEGIN;

ALTER TABLE public.recruitment_tasks
  ADD COLUMN IF NOT EXISTS blocker_reason text;

ALTER TABLE public.recruitment_task_status_history
  ADD COLUMN IF NOT EXISTS blocker_reason_at_change text;

CREATE OR REPLACE FUNCTION public.record_recruitment_task_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.recruitment_task_status_history
    (task_id, company_id, changed_by, old_status, new_status, changed_at,
     due_date_at_change, blocker_reason_at_change)
  VALUES
    (NEW.id, NEW.company_id, auth.uid(), OLD.status, NEW.status, now(),
     NEW.due_date::date,
     CASE WHEN NEW.status = 'blocked' THEN NULLIF(btrim(NEW.blocker_reason), '') ELSE NULL END);

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_recruitment_task_status_transition()
  FROM PUBLIC, anon, authenticated;

-- Existing task rows and historical events remain unchanged.
COMMIT;
