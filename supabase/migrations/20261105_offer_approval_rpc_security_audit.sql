-- Inspire Match ATS | Read-only approval RPC security inspection.
-- Run in Supabase SQL Editor and export the results.
-- This query does not alter permissions, functions or data.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS function_definition,
  p.prosecdef AS security_definer,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_my_hiring_decisions',
    'submit_offer_for_approval',
    'decide_offer_approval',
    'process_offer_approval'
  )
ORDER BY p.proname;
