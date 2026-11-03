-- Inspire Match ATS: notify a recruiter when a task is assigned or reassigned.
-- Uses the existing notifications table; no new tables, schedules, or payment flows.
-- Execute once in Supabase SQL Editor after the team task assignment migration.
BEGIN;

CREATE OR REPLACE FUNCTION public.notify_recruitment_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_title text;
  v_message text;
BEGIN
  -- A task assignment is a change in responsible user, not a status or due-date edit.
  IF NEW.assigned_to IS NULL OR NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;

  -- Never notify a user outside the task's company.
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = NEW.company_id AND cm.user_id = NEW.assigned_to
  ) THEN
    RETURN NEW;
  END IF;

  v_title := CASE WHEN TG_OP = 'INSERT' OR OLD.assigned_to IS NULL
    THEN 'New Recruitment Task Assigned'
    ELSE 'Recruitment Task Reassigned'
  END;
  v_message := 'You have been assigned the recruitment task: ' ||
    left(coalesce(NEW.title, 'Untitled task'), 160) ||
    CASE WHEN NEW.due_date IS NULL THEN ''
      ELSE '. Due: ' || NEW.due_date::text END;

  INSERT INTO public.notifications
    (company_id, recipient_id, title, message, type, priority, action_url)
  VALUES
    (NEW.company_id, NEW.assigned_to, v_title, v_message, 'team',
     CASE WHEN NEW.priority IN ('urgent','high') THEN 'high' ELSE 'medium' END,
     '/app/recruitment-operations/tasks');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Notification infrastructure must not block task assignment.
  RAISE WARNING 'Recruitment task assignment notification skipped: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_recruitment_task_assignment ON public.recruitment_tasks;
CREATE TRIGGER trg_notify_recruitment_task_assignment
AFTER INSERT OR UPDATE OF assigned_to ON public.recruitment_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_recruitment_task_assignment();

REVOKE ALL ON FUNCTION public.notify_recruitment_task_assignment() FROM PUBLIC, anon, authenticated;
COMMIT;
