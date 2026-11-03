-- Inspire Match ATS: auditable task status transitions and completion timestamps.
-- Apply once in Supabase SQL Editor. No existing task rows are modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.recruitment_task_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id uuid NOT NULL,
  company_id uuid,
  changed_by uuid,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recruitment_task_status_history_task
  ON public.recruitment_task_status_history (task_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruitment_task_status_history_company
  ON public.recruitment_task_status_history (company_id, changed_at DESC);

ALTER TABLE public.recruitment_task_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recruitment_task_status_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recruitment_task_status_history TO authenticated;

DROP POLICY IF EXISTS rt_task_status_history_manager_read ON public.recruitment_task_status_history;
CREATE POLICY rt_task_status_history_manager_read
ON public.recruitment_task_status_history FOR SELECT TO authenticated
USING (
  company_id IS NOT NULL
  AND public.can_manage_recruitment_tasks(company_id)
);

-- Audit changes from the existing UI and the assignee-only status RPC.
-- Recording a transition does not modify the recruitment_tasks table.
CREATE OR REPLACE FUNCTION public.record_recruitment_task_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.recruitment_task_status_history
    (task_id, company_id, changed_by, old_status, new_status, changed_at)
  VALUES
    (NEW.id, NEW.company_id, auth.uid(), OLD.status, NEW.status, now());

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_record_recruitment_task_status_transition ON public.recruitment_tasks;
CREATE TRIGGER trg_record_recruitment_task_status_transition
AFTER UPDATE OF status ON public.recruitment_tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.record_recruitment_task_status_transition();

REVOKE ALL ON FUNCTION public.record_recruitment_task_status_transition()
  FROM PUBLIC, anon, authenticated;
COMMIT;
