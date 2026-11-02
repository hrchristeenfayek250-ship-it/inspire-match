-- Inspire Match ATS | Private internal Sales CRM foundation
-- Apply AFTER saas_billing_private_sales_split.sql.
-- Sales-led only: no public lead intake, payment, tax invoice, company activation or subscription change.
begin;

create table if not exists public.billing_sales_leads (
 id uuid primary key default gen_random_uuid(),
 company_name text not null check (char_length(btrim(company_name)) between 2 and 160),
 contact_name text not null default '' check (char_length(contact_name) <= 160),
 contact_email text not null default '' check (char_length(contact_email) <= 254),
 contact_phone text not null default '' check (char_length(contact_phone) <= 60),
 country text not null default '' check (char_length(country) <= 80),
 source text not null default 'manual'
   check (source in ('manual','website','linkedin','outreach','referral','other')),
 stage text not null default 'new'
   check (stage in ('new','contacted','demo_scheduled','demo_completed','proposal','negotiation','won','lost')),
 notes text not null default '' check (char_length(notes) <= 5000),
 demo_at timestamptz,
 next_follow_up date,
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists billing_sales_leads_stage_idx
 on public.billing_sales_leads(stage,created_at desc);
create index if not exists billing_sales_leads_follow_up_idx
 on public.billing_sales_leads(next_follow_up) where next_follow_up is not null;

alter table public.billing_sales_leads enable row level security;
revoke all on public.billing_sales_leads from public,anon,authenticated;
grant select on public.billing_sales_leads to authenticated;
grant insert (company_name,contact_name,contact_email,contact_phone,country,
 source,stage,notes,demo_at,next_follow_up,created_by,updated_by)
 on public.billing_sales_leads to authenticated;
-- Keep id, created_by and historical timestamps immutable from the client.
grant update (company_name,contact_name,contact_email,contact_phone,country,
 source,stage,notes,demo_at,next_follow_up,updated_by)
 on public.billing_sales_leads to authenticated;

drop policy if exists billing_sales_leads_staff_read on public.billing_sales_leads;
create policy billing_sales_leads_staff_read
 on public.billing_sales_leads for select to authenticated
 using (public.billing_is_internal_staff());

drop policy if exists billing_sales_leads_sales_insert on public.billing_sales_leads;
create policy billing_sales_leads_sales_insert
 on public.billing_sales_leads for insert to authenticated
 with check (
  created_by=auth.uid() and updated_by=auth.uid() and
  exists (select 1 from public.billing_internal_staff s
   where s.user_id=auth.uid() and s.is_active
    and s.staff_role in ('sales','platform_admin'))
 );

drop policy if exists billing_sales_leads_sales_update on public.billing_sales_leads;
create policy billing_sales_leads_sales_update
 on public.billing_sales_leads for update to authenticated
 using (
  exists (select 1 from public.billing_internal_staff s
   where s.user_id=auth.uid() and s.is_active
    and s.staff_role in ('sales','platform_admin'))
 )
 with check (
  updated_by=auth.uid() and
  exists (select 1 from public.billing_internal_staff s
   where s.user_id=auth.uid() and s.is_active
    and s.staff_role in ('sales','platform_admin'))
 );

create table if not exists public.billing_sales_lead_stage_events (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.billing_sales_leads(id) on delete cascade,
 old_stage text,
 new_stage text not null,
 actor_id uuid references auth.users(id) on delete set null,
 happened_at timestamptz not null default now()
);
create index if not exists billing_sales_lead_stage_events_lead_idx
 on public.billing_sales_lead_stage_events(lead_id,happened_at desc);
alter table public.billing_sales_lead_stage_events enable row level security;
revoke all on public.billing_sales_lead_stage_events from public,anon,authenticated;
grant select on public.billing_sales_lead_stage_events to authenticated;
drop policy if exists billing_sales_lead_events_staff_read on public.billing_sales_lead_stage_events;
create policy billing_sales_lead_events_staff_read
 on public.billing_sales_lead_stage_events for select to authenticated
 using (public.billing_is_internal_staff());

create or replace function public.billing_sales_lead_touch()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 new.updated_at := now();
 return new;
end;
$$;
revoke all on function public.billing_sales_lead_touch() from public,anon,authenticated;

create or replace function public.billing_sales_lead_audit_stage()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='INSERT' or old.stage is distinct from new.stage then
  insert into public.billing_sales_lead_stage_events
    (lead_id,old_stage,new_stage,actor_id)
  values (new.id,case when tg_op='INSERT' then null else old.stage end,
   new.stage,auth.uid());
 end if;
 return new;
end;
$$;
revoke all on function public.billing_sales_lead_audit_stage() from public,anon,authenticated;

drop trigger if exists billing_sales_lead_updated_at on public.billing_sales_leads;
create trigger billing_sales_lead_updated_at
 before update on public.billing_sales_leads
 for each row execute function public.billing_sales_lead_touch();

drop trigger if exists billing_sales_lead_stage_audit on public.billing_sales_leads;
create trigger billing_sales_lead_stage_audit
 after insert or update of stage on public.billing_sales_leads
 for each row execute function public.billing_sales_lead_audit_stage();

commit;
