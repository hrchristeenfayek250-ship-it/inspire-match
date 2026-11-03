-- Inspire Match ATS: preserve deadline at the moment of each task status transition.
-- Run once after 20261103_recruitment_task_status_history.sql.
-- Historical rows are intentionally left NULL; old deadlines cannot be reconstructed reliably.
BEGIN;

ALTER TABLE public.recruitment_task_status_history
  ADD COLUMN IF NOT EXISTS due_date_at_change date;

CREATE OR REPLACE FUNCTION public.record_recruitment_task_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.recruitment_task_status_history
    (task_id, company_id, changed_by, old_status, new_status, changed_at, due_date_at_change)
  VALUES
    (NEW.id, NEW.company_id, auth.uid(), OLD.status, NEW.status, now(), NEW.due_date::date);

  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_recruitment_task_status_transition()
  FROM PUBLIC, anon, authenticated;

-- Keep the existing trigger; CREATE OR REPLACE FUNCTION updates its implementation.
-- Date-only deadlines are treated as inclusive calendar dates, not midnight timestamps.
COMMIT;
