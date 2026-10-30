-- Candidate Communication Smart Follow-up migration (run once in Supabase SQL Editor)
alter table public.candidate_communications
 add column if not exists follow_up_status text not null default 'pending',
 add column if not exists follow_up_resolved_at timestamptz;
alter table public.candidate_communications drop constraint if exists candidate_communications_follow_up_status_check;
alter table public.candidate_communications add constraint candidate_communications_follow_up_status_check check (follow_up_status in ('pending','completed'));
create index if not exists idx_candidate_comms_followup on public.candidate_communications(company_id,follow_up_status,next_follow_up_at);
drop policy if exists candidate_comms_update_followup on public.candidate_communications;
create policy candidate_comms_update_followup on public.candidate_communications
 for update to authenticated
 using (created_by=auth.uid() and exists(select 1 from public.company_members m where m.company_id=candidate_communications.company_id and m.user_id=auth.uid()))
 with check (created_by=auth.uid() and exists(select 1 from public.company_members m where m.company_id=candidate_communications.company_id and m.user_id=auth.uid()));
-- Existing entry fields remain editable by the entry creator under this policy.
-- Restricting UPDATE to follow-up columns only requires a dedicated SECURITY DEFINER RPC.
