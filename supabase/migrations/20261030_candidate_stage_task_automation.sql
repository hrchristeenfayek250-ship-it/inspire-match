-- Inspire Match: create recruitment follow-up tasks on candidate stage changes.
-- Run once in Supabase SQL Editor. Uses existing recruitment_tasks and company_members.
create table if not exists public.recruitment_stage_automation_log (
  candidate_id text not null,
  company_id uuid not null,
  stage text not null,
  task_key text not null,
  created_at timestamptz not null default now(),
  primary key(candidate_id,company_id,stage,task_key)
);
alter table public.recruitment_stage_automation_log enable row level security;
revoke all on public.recruitment_stage_automation_log from anon,authenticated;

create or replace function public.automate_recruitment_stage_tasks()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
  new_data jsonb := to_jsonb(new);
  old_data jsonb := to_jsonb(old);
  v_stage text;
  v_company uuid;
  v_actor uuid;
  v_candidate bigint;
  v_job bigint;
  v_title text;
  v_days int;
  v_key text;
  v_priority text;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  v_stage := lower(coalesce(new_data->>'stage',''));
  if v_stage = lower(coalesce(old_data->>'stage','')) then return new; end if;
  if v_stage not in ('screening','interview','shortlisted','hired','rejected') then return new; end if;
  if nullif(new_data->>'company_id','') is null or nullif(new_data->>'id','') is null then return new; end if;
  v_company := (new_data->>'company_id')::uuid;
  v_actor := auth.uid();
  -- Never generate tasks from unauthenticated updates or cross-company actors.
  if v_actor is null or not exists (
    select 1 from public.company_members m where m.company_id=v_company and m.user_id=v_actor
  ) then return new; end if;
  if (new_data->>'id') !~ '^[0-9]+$' then return new; end if;
  v_candidate := (new_data->>'id')::bigint;
  if (new_data->>'job_id') ~ '^[0-9]+$' then v_job := (new_data->>'job_id')::bigint; end if;
  case v_stage
    when 'screening' then v_key:='screening';v_title:='Complete candidate screening and record findings';v_days:=2;v_priority:='high';
    when 'interview' then v_key:='interview';v_title:='Coordinate interview schedule and interviewer feedback';v_days:=2;v_priority:='high';
    when 'shortlisted' then v_key:='shortlist';v_title:='Follow up with hiring manager on shortlisted candidate';v_days:=2;v_priority:='high';
    when 'hired' then v_key:='handoff';v_title:='Complete hiring handoff and documentation';v_days:=3;v_priority:='medium';
    when 'rejected' then v_key:='closure';v_title:='Complete candidate closure and communication';v_days:=2;v_priority:='medium';
  end case;
  insert into public.recruitment_stage_automation_log(candidate_id,company_id,stage,task_key)
  values(v_candidate::text,v_company,v_stage,v_key)
  on conflict do nothing;
  if not found then return new; end if;
  insert into public.recruitment_tasks
    (title,description,status,priority,due_date,company_id,created_by,assigned_to,job_id,candidate_id,updated_at)
  values
    (v_title,'Automatically generated when candidate entered '||v_stage||' stage.',
     'todo',v_priority,current_date+v_days,v_company,v_actor,v_actor,v_job,v_candidate,now());
  return new;
exception when others then
  -- Candidate stage changes must never fail because a follow-up task could not be created.
  raise warning 'Recruitment stage automation skipped: %',sqlerrm;
  return new;
end;
$$;
drop trigger if exists trg_automate_recruitment_stage_tasks on public.candidates;
create trigger trg_automate_recruitment_stage_tasks
after update on public.candidates
for each row execute function public.automate_recruitment_stage_tasks();
revoke all on function public.automate_recruitment_stage_tasks() from public,anon,authenticated;
