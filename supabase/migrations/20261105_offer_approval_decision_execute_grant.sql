-- Inspire Match ATS | Allow assigned approvers to use the guarded sequential decision RPC.
-- Run in Supabase SQL Editor after reviewing decide_offer_approval function definition.
-- The SECURITY DEFINER function itself validates auth.uid(), tenant membership,
-- required approver role, specifically assigned user (when set), current pending
-- step and self-approval prohibition. It returns status text only, not salary.
-- Do not grant process_offer_approval to hiring managers: it is a separate flow.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.decide_offer_approval(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_offer_approval(uuid, text, text)
  TO authenticated;

-- Explicitly preserve restricted execution of the legacy, non-step-specific path.
REVOKE EXECUTE ON FUNCTION public.process_offer_approval(uuid, text, text)
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- Check effective privileges:
SELECT
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('decide_offer_approval','process_offer_approval')
ORDER BY p.proname;
