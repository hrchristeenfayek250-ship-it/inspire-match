-- Inspire Match ATS | Make the approval inbox match sequential approval authorization.
--
-- The former get_my_hiring_decisions() displayed only steps with a specific
-- approver_user_id and the hiring_manager role. However decide_offer_approval()
-- also permits role-assigned steps (approver_user_id IS NULL) for any matching
-- company member. This change makes those genuinely actionable steps visible.
-- No salary, financial columns, or other confidential offer details are returned.
--
-- Applies to all workflow roles, including Hiring Manager, HR Manager and Admin.
-- An offer creator is not listed as an approver of their own offer, matching
-- decide_offer_approval()'s existing self-approval restriction.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_my_hiring_decisions()
RETURNS TABLE (
  offer_id uuid,
  job_title text,
  step_name text,
  step_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    o.id AS offer_id,
    o.job_title::text AS job_title,
    i.step_name::text AS step_name,
    i.status::text AS step_status
  FROM public.recruitment_offers AS o
  JOIN public.offer_approval_instances AS i
    ON i.offer_id = o.id
  JOIN public.company_members AS cm
    ON cm.company_id = o.company_id
   AND cm.user_id = (SELECT auth.uid())
   AND cm.role = i.approver_role
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND o.created_by IS DISTINCT FROM (SELECT auth.uid())
    AND o.status = 'pending_approval'
    AND o.approval_status = 'pending'
    AND o.current_approval_step = i.step_order
    AND i.status = 'pending'
    AND (
      i.approver_user_id IS NULL
      OR i.approver_user_id = (SELECT auth.uid())
    )
  ORDER BY o.id, i.step_order;
$function$;

REVOKE ALL ON FUNCTION public.get_my_hiring_decisions()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_hiring_decisions()
  TO authenticated;

COMMIT;

-- Read-only verification: role-based approvals can now appear in the inbox,
-- while the returned shape contains no compensation fields.
SELECT
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AS authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE')
    AS anon_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_hiring_decisions';
