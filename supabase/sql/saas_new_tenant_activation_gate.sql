-- Inspire Match ATS | Sales-approved tenant activation gate (new tenants only)
-- Apply once in Supabase SQL Editor using a privileged database account.
-- Existing company IDs are snapshotted exactly once and remain grandfathered.
-- No prices, checkout, payment collection, memberships or tenant data are changed.
-- Future companies remain gated until a trusted service_role sets activation_status='approved'.
-- Suspended workspaces are always gated, even if previously grandfathered.
--
-- This enforces RLS on public tenant tables that already have company_id UUID and RLS enabled.
-- It intentionally does NOT change currently RLS-disabled tables or SECURITY DEFINER RPCs.
-- Follow-on API/RPC audit is necessary before calling production enforcement complete.

begin;

create table if not exists public.billing_tenant_gate_baseline (
 singleton boolean primary key default true check (singleton),
 installed_at timestamptz not null default now()
);

create table if not exists public.billing_tenant_gate_legacy_companies (
 company_id uuid primary key references public.companies(id) on delete cascade,
 preserved_at timestamptz not null default now()
);

alter table public.billing_tenant_gate_baseline enable row level security;
alter table public.billing_tenant_gate_legacy_companies enable row level security;
revoke all on public.billing_tenant_gate_baseline from public, anon, authenticated;
revoke all on public.billing_tenant_gate_legacy_companies from public, anon, authenticated;
grant select, insert, update, delete on public.billing_tenant_gate_baseline to service_role;
grant select, insert, update, delete on public.billing_tenant_gate_legacy_companies to service_role;

-- Snapshot companies only on FIRST successful application.
-- Re-running this migration cannot grandfather a newly-created company.
do $$
begin
 perform pg_catalog.pg_advisory_xact_lock(64179024);
 insert into public.billing_tenant_gate_baseline(singleton) values(true)
 on conflict (singleton) do nothing;

 if found then
   insert into public.billing_tenant_gate_legacy_companies(company_id)
   select id from public.companies
   on conflict (company_id) do nothing;
 end if;
end $$;

-- Add-on approval information; RLS bypass only for trusted function owner.
create or replace function public.billing_company_tenant_enabled(p_company_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
 select case
   when p_company_id is null then false
   when a.activation_status='suspended' then false
   when a.activation_status='approved' then true
   else exists (
     select 1 from public.billing_tenant_gate_legacy_companies x
     where x.company_id = p_company_id
   )
 end
 from (select p_company_id as company_id) input
 left join public.billing_company_activation a on a.company_id=input.company_id;
$$;

revoke all on function public.billing_company_tenant_enabled(uuid)
from public, anon;
grant execute on function public.billing_company_tenant_enabled(uuid)
to authenticated, service_role;

-- Trustworthy self-access snapshot for the app's route-level access guard.
create or replace function public.billing_my_tenant_entry_gate()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
 v_member_count bigint;
 v_allowed_count bigint;
 v_is_internal boolean;
begin
 if auth.uid() is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;

 select exists (
  select 1 from public.billing_internal_staff s
  where s.user_id=auth.uid() and s.is_active
 ) into v_is_internal;

 select count(*), count(*) filter (
   where public.billing_company_tenant_enabled(m.company_id)
 ) into v_member_count, v_allowed_count
 from public.company_members m
 where m.user_id=auth.uid();

 return pg_catalog.jsonb_build_object(
  'allowed', (v_allowed_count > 0 or v_is_internal),
  'internal_staff', v_is_internal,
  'has_company_membership', v_member_count > 0,
  'reason', case
    when v_allowed_count > 0 or v_is_internal then 'allowed'
    when v_member_count > 0 then 'awaiting_activation'
    else 'no_workspace'
  end
 );
end;
$$;

revoke all on function public.billing_my_tenant_entry_gate()
from public, anon;
grant execute on function public.billing_my_tenant_entry_gate()
to authenticated;

-- Restrictive policies are ANDed with existing policies; membership and role
-- RLS protections stay intact. Nullable legacy rows still follow old RLS.
do $$
declare r record;
begin
 for r in
   select n.nspname as schema_name, c.relname as table_name
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   join pg_catalog.pg_attribute a on a.attrelid=c.oid
   where n.nspname='public'
     and c.relkind in ('r','p')
     and c.relrowsecurity=true
     and a.attname='company_id'
     and a.atttypid='pg_catalog.uuid'::pg_catalog.regtype
     and a.attnum>0 and not a.attisdropped
     and c.relname not like 'billing_%'
   order by c.relname
 loop
   execute pg_catalog.format(
    'drop policy if exists billing_tenant_activation_guard on %I.%I',
    r.schema_name, r.table_name
   );
   execute pg_catalog.format(
    'create policy billing_tenant_activation_guard on %I.%I as restrictive for all to authenticated
      using (company_id is null or public.billing_company_tenant_enabled(company_id))
      with check (company_id is null or public.billing_company_tenant_enabled(company_id))',
    r.schema_name, r.table_name
   );
 end loop;
end $$;

-- companies uses id (not company_id). Preserve existing RLS conditions.
drop policy if exists billing_tenant_activation_guard on public.companies;
create policy billing_tenant_activation_guard on public.companies
 as restrictive for all to authenticated
 using (public.billing_company_tenant_enabled(id))
 with check (public.billing_company_tenant_enabled(id));

commit;

-- Post-migration verification: no changes from these SELECT statements.
select
 (select count(*) from public.billing_tenant_gate_legacy_companies) as legacy_companies_preserved,
 (select installed_at from public.billing_tenant_gate_baseline where singleton=true) as first_installed_at,
 (select count(*) from pg_catalog.pg_policies
   where schemaname='public' and policyname='billing_tenant_activation_guard') as restrictive_policies_installed,
 (select coalesce(pg_catalog.string_agg(c.relname, ', ' order by c.relname),'none')
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_attribute a on a.attrelid=c.oid
  where n.nspname='public' and c.relkind in ('r','p')
    and not c.relrowsecurity and a.attname='company_id'
    and a.atttypid='pg_catalog.uuid'::pg_catalog.regtype
    and a.attnum>0 and not a.attisdropped
    and c.relname not like 'billing_%') as tenant_tables_still_without_rls;
