-- Inspire Match ATS | Restrict confidential employment offers to HR staff.
-- Run in Supabase SQL Editor after the existing offer/approval schema.
-- This is a restrictive RLS policy: it applies in addition to existing
-- permissive policies. It does NOT grant HR access by itself.
-- Hiring Managers should approve through dedicated, narrowly scoped
-- SECURITY DEFINER RPCs, never by selecting recruitment_offers.
BEGIN;

ALTER TABLE public.recruitment_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruitment_offers_hr_confidentiality_guard
  ON public.recruitment_offers;

CREATE POLICY recruitment_offers_hr_confidentiality_guard
ON public.recruitment_offers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = recruitment_offers.company_id
      AND cm.user_id = (SELECT auth.uid())
      AND lower(cm.role) IN (
        'admin','hr_manager','senior_recruiter',
        'hr','recruiter','hr_specialist'
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_members cm
    WHERE cm.company_id = recruitment_offers.company_id
      AND cm.user_id = (SELECT auth.uid())
      AND lower(cm.role) IN (
        'admin','hr_manager','senior_recruiter',
        'hr','recruiter','hr_specialist'
      )
  )
);

-- Existing permissive RLS policies remain intact. Service-role and
-- owner-executed SECURITY DEFINER functions bypass this guard as normal.
-- Review approval RPC definitions before enabling direct offer access for
-- any other role. No records or salaries are changed.
COMMIT;
