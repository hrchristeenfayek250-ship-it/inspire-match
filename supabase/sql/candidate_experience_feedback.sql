-- Candidate Feedback & Experience Insights
create table if not exists public.candidate_experience_feedback (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 candidate_id text not null,
 created_by uuid not null references auth.users(id),
 category text not null check(category in ('Application Experience','Recruiter Communication','Interview Experience','Process Clarity','Overall Experience')),
 source text not null check(source in ('Candidate reported','Recruiter observation')),
 rating integer not null check(rating between 1 and 5),
 feedback text not null check(length(trim(feedback)) between 1 and 3000),
 action_required boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists idx_candidate_feedback_company_created on public.candidate_experience_feedback(company_id,created_at desc);
alter table public.candidate_experience_feedback enable row level security;
drop policy if exists candidate_feedback_select on public.candidate_experience_feedback;
create policy candidate_feedback_select on public.candidate_experience_feedback for select to authenticated
 using(exists(select 1 from public.company_members m where m.company_id=candidate_experience_feedback.company_id and m.user_id=auth.uid()));
drop policy if exists candidate_feedback_insert on public.candidate_experience_feedback;
create policy candidate_feedback_insert on public.candidate_experience_feedback for insert to authenticated
 with check(created_by=auth.uid() and exists(select 1 from public.company_members m where m.company_id=candidate_experience_feedback.company_id and m.user_id=auth.uid())
 and exists(select 1 from public.candidates c where c.id::text=candidate_experience_feedback.candidate_id and c.company_id=candidate_experience_feedback.company_id and c.deleted_at is null));
-- Append-only audit trail: no UPDATE or DELETE policies.
