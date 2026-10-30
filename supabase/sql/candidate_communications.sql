-- Inspire Match ATS — Candidate Communication Hub
-- Run once in Supabase SQL Editor before using the communication form.
create table if not exists public.candidate_communications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  candidate_id text not null,
  created_by uuid not null references auth.users(id),
  channel text not null check (channel in ('Email','Phone','WhatsApp','SMS','Video','Other')),
  direction text not null check (direction in ('inbound','outbound')),
  outcome text not null check (outcome in ('Contacted','Replied','No response','Interview coordination','Follow-up needed','Other')),
  contacted_at timestamptz not null,
  next_follow_up_at timestamptz,
  notes text check (length(notes) <= 3000),
  created_at timestamptz not null default now(),
  constraint communication_followup_after_contact check (next_follow_up_at is null or next_follow_up_at > contacted_at)
);
create index if not exists idx_candidate_comms_company_date on public.candidate_communications(company_id, contacted_at desc);
create index if not exists idx_candidate_comms_candidate_date on public.candidate_communications(company_id, candidate_id, contacted_at desc);
alter table public.candidate_communications enable row level security;
drop policy if exists candidate_comms_select on public.candidate_communications;
create policy candidate_comms_select on public.candidate_communications for select to authenticated
using (
  exists (select 1 from public.company_members m where m.company_id = candidate_communications.company_id and m.user_id = auth.uid())
);
drop policy if exists candidate_comms_insert on public.candidate_communications;
create policy candidate_comms_insert on public.candidate_communications for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from public.company_members m where m.company_id = candidate_communications.company_id and m.user_id = auth.uid())
  and exists (select 1 from public.candidates c where c.id::text = candidate_communications.candidate_id and c.company_id = candidate_communications.company_id and c.deleted_at is null)
);
-- Communication history is append-only. No UPDATE or DELETE policies are granted.
