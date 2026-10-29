-- Inspire Match ATS: Team Task Assignment (run once in Supabase SQL Editor)
-- Existing personal tasks remain valid.
BEGIN;

ALTER TABLE public.recruitment_tasks
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_to uuid;

CREATE INDEX IF NOT EXISTS idx_recruitment_tasks_company_id
  ON public.recruitment_tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_tasks_assigned_to
  ON public.recruitment_tasks (assigned_to);

-- Backfill only when a task owner belongs to exactly one company.
UPDATE public.recruitment_tasks t
SET company_id = (
  SELECT MIN(cm.company_id)
  FROM public.company_members cm
  WHERE cm.user_id = t.created_by
  HAVING COUNT(DISTINCT cm.company_id) = 1
)
WHERE t.company_id IS NULL
  AND (SELECT COUNT(DISTINCT cm.company_id)
       FROM public.company_members cm
       WHERE cm.user_id = t.created_by) = 1;

CREATE OR REPLACE FUNCTION public.can_manage_recruitment_tasks(p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND p_company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = p_company_id
      AND cm.user_id = auth.uid()
      AND lower(cm.role) IN ('admin', 'hr_manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_assigned_recruitment_task(p_company_id uuid, p_assigned_to uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = p_assigned_to
    AND EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = p_company_id AND cm.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.validate_recruitment_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Task ownership cannot be changed.';
    END IF;
  END IF;

  IF NEW.assigned_to IS NOT NULL AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Select a company before assigning this task.';
  END IF;

  IF NEW.company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = NEW.company_id AND cm.user_id = NEW.created_by
    ) THEN
      RAISE EXCEPTION 'Task creator must belong to the selected company.';
    END IF;

    IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = NEW.company_id AND cm.user_id = NEW.assigned_to
    ) THEN
      RAISE EXCEPTION 'Assigned employee must belong to the selected company.';
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> auth.uid()
      AND NOT public.can_manage_recruitment_tasks(NEW.company_id) THEN
      RAISE EXCEPTION 'Only a company admin or HR manager can assign tasks to teammates.';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      IF NEW.company_id IS DISTINCT FROM OLD.company_id AND OLD.company_id IS NOT NULL
        AND NOT public.can_manage_recruitment_tasks(OLD.company_id) THEN
        RAISE EXCEPTION 'Only company admins and HR managers can move tasks between companies.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_recruitment_task_assignment ON public.recruitment_tasks;
CREATE TRIGGER trg_validate_recruitment_task_assignment
  BEFORE INSERT OR UPDATE ON public.recruitment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_recruitment_task_assignment();

CREATE OR REPLACE FUNCTION public.update_my_recruitment_task_status(p_task_id uuid, p_status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_updated integer;
BEGIN
  IF p_status NOT IN ('todo','in_progress','blocked','completed') THEN
    RAISE EXCEPTION 'Invalid task status.';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign-in required.';
  END IF;
  UPDATE public.recruitment_tasks t
  SET status = p_status, updated_at = now()
  WHERE t.id = p_task_id
    AND t.assigned_to = auth.uid()
    AND public.can_access_assigned_recruitment_task(t.company_id, t.assigned_to);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_recruitment_tasks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_assigned_recruitment_task(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_my_recruitment_task_status(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_recruitment_tasks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_assigned_recruitment_task(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_recruitment_task_status(uuid,text) TO authenticated;

-- Extra policies are additive: existing owner-only policies are preserved.
DROP POLICY IF EXISTS "rt_manager_read_team_tasks" ON public.recruitment_tasks;
CREATE POLICY "rt_manager_read_team_tasks" ON public.recruitment_tasks
  FOR SELECT TO authenticated
  USING (public.can_manage_recruitment_tasks(company_id)
    OR public.can_access_assigned_recruitment_task(company_id, assigned_to));

DROP POLICY IF EXISTS "rt_manager_update_team_tasks" ON public.recruitment_tasks;
CREATE POLICY "rt_manager_update_team_tasks" ON public.recruitment_tasks
  FOR UPDATE TO authenticated
  USING (public.can_manage_recruitment_tasks(company_id))
  WITH CHECK (public.can_manage_recruitment_tasks(company_id));

DROP POLICY IF EXISTS "rt_manager_delete_team_tasks" ON public.recruitment_tasks;
CREATE POLICY "rt_manager_delete_team_tasks" ON public.recruitment_tasks
  FOR DELETE TO authenticated
  USING (public.can_manage_recruitment_tasks(company_id));

-- Give managers the ability to populate the team assignment dropdown.
DROP POLICY IF EXISTS "rt_managers_view_company_members" ON public.company_members;
CREATE POLICY "rt_managers_view_company_members" ON public.company_members
  FOR SELECT TO authenticated
  USING (public.can_manage_recruitment_tasks(company_id));

COMMIT;