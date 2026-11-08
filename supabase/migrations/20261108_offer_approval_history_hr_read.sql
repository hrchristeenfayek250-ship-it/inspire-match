-- Inspire Match ATS | Read-only offer approval timeline for authorized HR.
-- Run once in Supabase SQL Editor. No existing offers, steps, or history is changed.
-- Salary, benefits and other offer financial details are NOT returned.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_offer_approval_history_for_hr(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_company uuid;
  v_result jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT o.company_id INTO v_company
  FROM public.recruitment_offers o
  WHERE o.id = p_offer_id;

  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = v_company
      AND cm.user_id = v_user
      AND lower(cm.role::text) IN (
        'admin', 'hr_manager', 'senior_recruiter',
        'hr', 'recruiter', 'hr_specialist'
      )
  ) THEN
    RAISE EXCEPTION 'Offer approval history is restricted to authorized HR staff';
  END IF;

  SELECT jsonb_build_object(
    'events',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', coalesce(to_jsonb(h)->>'action', 'event'),
          'comments', coalesce(to_jsonb(h)->>'comments', ''),
          'occurred_at', coalesce(
            to_jsonb(h)->>'created_at',
            to_jsonb(h)->>'action_at',
            to_jsonb(h)->>'occurred_at',
            to_jsonb(h)->>'decided_at'
          )
        ) ORDER BY coalesce(
          to_jsonb(h)->>'created_at',
          to_jsonb(h)->>'action_at',
          to_jsonb(h)->>'occurred_at',
          to_jsonb(h)->>'decided_at',
          ''
        ) ASC
      )
      FROM public.offer_approval_history h
      WHERE h.offer_id = p_offer_id
    ), '[]'::jsonb),
    'steps',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'step_name', i.step_name,
          'step_order', i.step_order,
          'status', i.status,
          'approver_role', i.approver_role
        ) ORDER BY i.step_order
      )
      FROM public.offer_approval_instances i
      WHERE i.offer_id = p_offer_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_offer_approval_history_for_hr(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_offer_approval_history_for_hr(uuid)
TO authenticated;

COMMIT;
