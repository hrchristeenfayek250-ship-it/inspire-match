-- Atomic blocked-status and reason updates for assigned recruiters.
-- Execute after 20261103_recruitment_task_blocker_reasons.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.update_my_recruitment_task_status_with_reason(
  p_task_id uuid, p_status text, p_blocker_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign-in required.'; END IF;
  IF p_status NOT IN ('todo','in_progress','blocked','completed') THEN
    RAISE EXCEPTION 'Invalid task status.';
  END IF;
  IF p_status = 'blocked' AND length(btrim(coalesce(p_blocker_reason,''))) = 0 THEN
    RAISE EXCEPTION 'Blocker reason is required.';
  END IF;
  IF length(coalesce(p_blocker_reason,'')) > 500 THEN
    RAISE EXCEPTION 'Blocker reason cannot exceed 500 characters.';
  END IF;
  UPDATE public.recruitment_tasks t
  SET status = p_status,
      blocker_reason = CASE WHEN p_status = 'blocked'
        THEN btrim(p_blocker_reason) ELSE NULL END,
      updated_at = now()
  WHERE t.id = p_task_id
    AND t.assigned_to = auth.uid()
    AND public.can_access_assigned_recruitment_task(t.company_id, t.assigned_to);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$fn$;
REVOKE ALL ON FUNCTION public.update_my_recruitment_task_status_with_reason(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_recruitment_task_status_with_reason(uuid,text,text) TO authenticated;
COMMIT;
