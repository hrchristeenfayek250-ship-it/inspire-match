-- INT-04 Candidate self-scheduling (deploy this migration in Supabase before using the pages).
-- Candidate links contain a high-entropy bearer token. The public API returns
-- only available slots and a generic status. No candidate PII is exposed.
begin;

create table if not exists public.interview_schedule_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  application_id bigint not null,
  created_by uuid not null,
  token_hash text not null unique,
  slots jsonb not null,
  interview_type text not null default 'Online',
  interviewer text not null,
  meeting_platform text not null default 'Other',
  meeting_link text,
  interview_location text,
  interview_location_link text,
  status text not null default 'pending' check (status in ('pending','booked','revoked','expired')),
  selected_at timestamptz,
  selected_slot timestamptz,
  interview_id bigint,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint schedule_slots_array check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) between 1 and 10),
  constraint schedule_expiry_limit check (expires_at <= created_at + interval '15 days')
);
create index if not exists schedule_invitations_company_idx on public.interview_schedule_invitations(company_id,created_at desc);
create index if not exists schedule_invitations_application_idx on public.interview_schedule_invitations(application_id);
alter table public.interview_schedule_invitations enable row level security;
revoke all on public.interview_schedule_invitations from anon,authenticated;
grant select on public.interview_schedule_invitations to authenticated;
drop policy if exists schedule_invitations_member_read on public.interview_schedule_invitations;
create policy schedule_invitations_member_read on public.interview_schedule_invitations for select to authenticated using
 (exists(select 1 from public.company_members m where m.company_id=interview_schedule_invitations.company_id and m.user_id=(select auth.uid())));

create or replace function public.create_interview_schedule_invitation(
 p_company_id uuid,p_application_id bigint,p_slots jsonb,p_interviewer text,
 p_interview_type text default 'Online',p_meeting_platform text default 'Other',
 p_meeting_link text default null,p_interview_location text default null,
 p_interview_location_link text default null,p_expires_days int default 7
)
returns text language plpgsql security definer set search_path='' as $$
declare v_token text;v_slot text;v_dt timestamptz;
begin
 if auth.uid() is null or not exists(select 1 from public.company_members cm where cm.company_id=p_company_id and cm.user_id=auth.uid())
 then raise exception 'Workspace access denied';end if;
 if not exists(select 1 from public.applications a where a.id=p_application_id and a.company_id=p_company_id)
 then raise exception 'Application does not belong to this workspace';end if;
 if p_slots is null or jsonb_typeof(p_slots)<>'array' or jsonb_array_length(p_slots) not between 1 and 10
 then raise exception 'Provide 1 to 10 available slots';end if;
 if length(trim(coalesce(p_interviewer,'')))<2 or length(p_interviewer)>200
 then raise exception 'Interviewer required';end if;
 if p_expires_days not between 1 and 14 then raise exception 'Expiry must be 1 to 14 days';end if;
 for v_slot in select value from jsonb_array_elements_text(p_slots) loop
  begin v_dt:=v_slot::timestamptz;exception when others then raise exception 'Invalid slot';end;
  if v_dt<=now() or v_dt>now()+interval '90 days' then raise exception 'Slots must be future dates within 90 days';end if;
 end loop;
 v_token:=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into public.interview_schedule_invitations
 (company_id,application_id,created_by,token_hash,slots,interview_type,interviewer,meeting_platform,meeting_link,interview_location,interview_location_link,expires_at)
 values(p_company_id,p_application_id,auth.uid(),md5(v_token),p_slots,left(coalesce(p_interview_type,'Online'),80),trim(p_interviewer),
 left(coalesce(p_meeting_platform,'Other'),80),nullif(p_meeting_link,''),nullif(p_interview_location,''),nullif(p_interview_location_link,''),now()+make_interval(days=>p_expires_days));
 return v_token;
end $$;
revoke all on function public.create_interview_schedule_invitation(uuid,bigint,jsonb,text,text,text,text,text,text,int) from public,anon;
grant execute on function public.create_interview_schedule_invitation(uuid,bigint,jsonb,text,text,text,text,text,text,int) to authenticated;

create or replace function public.get_interview_schedule_options(p_token text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.interview_schedule_invitations%rowtype;
begin
 if p_token is null or length(p_token)<>72 then return jsonb_build_object('status','unavailable');end if;
 select * into v from public.interview_schedule_invitations where token_hash=md5(p_token) limit 1;
 if not found then return jsonb_build_object('status','unavailable');end if;
 if v.status='booked' then return jsonb_build_object('status','booked');end if;
 if v.status<>'pending' or v.expires_at<=now() then return jsonb_build_object('status','unavailable');end if;
 return jsonb_build_object('status','pending','slots',v.slots,'expires_at',v.expires_at,'type',v.interview_type);
end $$;
revoke all on function public.get_interview_schedule_options(text) from public;
grant execute on function public.get_interview_schedule_options(text) to anon,authenticated;

create or replace function public.book_interview_schedule_option(p_token text,p_slot text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.interview_schedule_invitations%rowtype;v_dt timestamptz;v_interview_id bigint;
begin
 if p_token is null or length(p_token)<>72 then return jsonb_build_object('status','unavailable');end if;
 select * into v from public.interview_schedule_invitations where token_hash=md5(p_token) for update;
 if not found or v.status<>'pending' or v.expires_at<=now() then return jsonb_build_object('status','unavailable');end if;
 if not (v.slots ? p_slot) then return jsonb_build_object('status','invalid_slot');end if;
 begin v_dt:=p_slot::timestamptz;exception when others then return jsonb_build_object('status','invalid_slot');end;
 if v_dt<=now() then return jsonb_build_object('status','invalid_slot');end if;
 -- A token can be booked only once; the row lock serializes concurrent requests.
 insert into public.interviews(application_id,company_id,user_id,scheduled_at,type,interviewer,meeting_platform,meeting_link,interview_location,interview_location_link,status)
 values(v.application_id,v.company_id,v.created_by,v_dt,v.interview_type,v.interviewer,v.meeting_platform,v.meeting_link,v.interview_location,v.interview_location_link,'scheduled')
 returning id into v_interview_id;
 update public.interview_schedule_invitations set status='booked',selected_slot=v_dt,selected_at=now(),interview_id=v_interview_id where id=v.id;
 return jsonb_build_object('status','booked','scheduled_at',v_dt);
end $$;
revoke all on function public.book_interview_schedule_option(text,text) from public;
grant execute on function public.book_interview_schedule_option(text,text) to anon,authenticated;
commit;
