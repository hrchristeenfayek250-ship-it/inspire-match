-- Inspire Match ATS | Secure offer revisions and sequential resubmission
-- Requires an explicit one-time execution in Supabase SQL Editor.
-- The former completed/rejected/changes-requested approval history is retained.
-- Neither function returns financial details to its caller.
BEGIN;

ALTER TABLE public.recruitment_offers
  ADD COLUMN IF NOT EXISTS last_revised_at timestamptz;

-- HR may edit financial/offer fields only while a draft or changes are requested.
-- Company, candidate, job, creator and workflow remain immutable in this RPC.
CREATE OR REPLACE FUNCTION public.revise_offer_draft(
  p_offer_id uuid,
  p_base_salary numeric,
  p_currency text,
  p_proposed_start_date date,
  p_benefits text,
  p_internal_notes text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_offer public.recruitment_offers%ROWTYPE;
  v_currency text := upper(btrim(coalesce(p_currency, '')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_offer
  FROM public.recruitment_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = v_offer.company_id
      AND cm.user_id = v_user_id
      AND (
        cm.role IN ('admin', 'hr_manager')
        OR (
          cm.role IN ('hr', 'recruiter', 'senior_recruiter', 'hr_specialist')
          AND v_offer.created_by = v_user_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to revise this offer';
  END IF;

  IF v_offer.status NOT IN ('draft', 'changes_requested') THEN
    RAISE EXCEPTION 'Only draft offers or offers with requested changes can be revised';
  END IF;

  IF v_offer.status = 'changes_requested'
    AND v_offer.approval_status IS DISTINCT FROM 'changes_requested' THEN
    RAISE EXCEPTION 'Offer approval state does not allow revision';
  END IF;

  IF p_base_salary < 0 OR p_base_salary = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Salary must be a non-negative number';
  END IF;

  IF v_currency NOT IN ('EGP', 'SAR', 'AED', 'USD') THEN
    RAISE EXCEPTION 'Unsupported currency';
  END IF;

  UPDATE public.recruitment_offers
  SET
    base_salary = p_base_salary,
    currency = v_currency,
    proposed_start_date = p_proposed_start_date,
    benefits = nullif(btrim(p_benefits), ''),
    internal_notes = nullif(btrim(p_internal_notes), ''),
    last_revised_at = CASE
      WHEN v_offer.status = 'changes_requested' THEN clock_timestamp()
      ELSE last_revised_at
    END,
    updated_at = clock_timestamp()
  WHERE id = p_offer_id;

  RETURN 'Offer revisions saved';
END;
$function$;

REVOKE ALL ON FUNCTION public.revise_offer_draft(
  uuid, numeric, text, date, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revise_offer_draft(
  uuid, numeric, text, date, text, text
) TO authenticated;

-- Resubmission restarts the existing step snapshot from the first step.
-- Previous decisions remain in offer_approval_history; we never delete it.
-- A revision must have been saved AFTER the last changes-requested decision.
CREATE OR REPLACE FUNCTION public.resubmit_revised_offer(p_offer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_offer public.recruitment_offers%ROWTYPE;
  v_last_change_at timestamptz;
  v_first_step integer;
  v_step_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_offer
  FROM public.recruitment_offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_members cm
    WHERE cm.company_id = v_offer.company_id
      AND cm.user_id = v_user_id
      AND (
        cm.role IN ('admin', 'hr_manager')
        OR (
          cm.role IN ('hr', 'recruiter', 'senior_recruiter', 'hr_specialist')
          AND v_offer.created_by = v_user_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to resubmit this offer';
  END IF;

  IF v_offer.status IS DISTINCT FROM 'changes_requested'
    OR v_offer.approval_status IS DISTINCT FROM 'changes_requested' THEN
    RAISE EXCEPTION 'Only offers with requested changes can be resubmitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.offer_approval_workflows w
    WHERE w.id = v_offer.approval_workflow_id
      AND w.company_id = v_offer.company_id
      AND w.is_active = true
  ) THEN
    RAISE EXCEPTION 'Approval workflow is no longer active. Contact HR administration';
  END IF;

  SELECT max(i.decided_at)
  INTO v_last_change_at
  FROM public.offer_approval_instances i
  WHERE i.offer_id = p_offer_id
    AND i.status = 'changes_requested';

  IF v_last_change_at IS NULL THEN
    RAISE EXCEPTION 'No previous changes-requested decision found';
  END IF;

  IF v_offer.last_revised_at IS NULL
     OR v_offer.last_revised_at <= v_last_change_at THEN
    RAISE EXCEPTION 'Save a revision before resubmitting this offer';
  END IF;

  SELECT count(*), min(step_order)
  INTO v_step_count, v_first_step
  FROM public.offer_approval_instances
  WHERE offer_id = p_offer_id;

  IF v_step_count = 0 OR v_first_step IS NULL THEN
    RAISE EXCEPTION 'No existing approval steps for this offer';
  END IF;

  -- Safely prevent cross-company/removed-record resubmission.
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = v_offer.job_id
      AND j.company_id = v_offer.company_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = v_offer.candidate_id
      AND c.company_id = v_offer.company_id
  ) THEN
    RAISE EXCEPTION 'Offer job or candidate no longer belongs to this company';
  END IF;

  UPDATE public.offer_approval_instances
  SET status = 'pending',
      decided_by = NULL,
      decided_at = NULL
  WHERE offer_id = p_offer_id;

  UPDATE public.recruitment_offers
  SET status = 'pending_approval',
      approval_status = 'pending',
      current_approval_step = v_first_step,
      submitted_for_approval_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE id = p_offer_id;

  INSERT INTO public.offer_approval_history (
    offer_id, action, action_by, comments
  )
  VALUES (
    p_offer_id, 'submitted', v_user_id,
    'Resubmitted after requested changes'
  );

  RETURN 'Revised offer submitted for approval';
END;
$function$;

REVOKE ALL ON FUNCTION public.resubmit_revised_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resubmit_revised_offer(uuid)
  TO authenticated;

COMMIT;
