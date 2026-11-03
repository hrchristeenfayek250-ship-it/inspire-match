-- Inspire Match ATS | Disable legacy self-service company creation
-- Purpose: stop authenticated end users from creating tenant companies directly.
-- Existing companies, memberships, invitations, and service_role provisioning stay unchanged.
-- IMPORTANT: /app/company-setup must later be replaced with Contact Sales / pending access UI.
begin;

-- Supabase service_role retains its INSERT permission; ordinary authenticated
-- users can no longer bypass sales-led provisioning through the legacy UI.
revoke insert on table public.companies from authenticated;

-- Remove only the founder's automatic first-admin policy. Do not revoke
-- INSERT on company_members: other existing invitation flows may depend on it.
drop policy if exists "Company founder creates initial admin"
  on public.company_members;

-- Ensure that the intended direct signup pathway is closed.
do $$
begin
  if pg_catalog.has_table_privilege('authenticated', 'public.companies', 'INSERT') then
    raise exception 'Authenticated users still have INSERT privilege on public.companies';
  end if;
end
$$;

commit;

-- Rollback (ONLY if intentionally restoring self-service company signup):
-- grant insert on table public.companies to authenticated;
-- Recreate the founder policy from the previous security audit before
-- restoring the old onboarding flow; this migration intentionally does not
-- restore it automatically.
