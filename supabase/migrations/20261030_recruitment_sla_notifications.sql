-- Smart SLA notifications: execute once in Supabase SQL Editor.
-- Uses the existing notifications table and the existing email webhook pipeline.
create table if not exists public.recruitment_sla_alert_log (
  task_id text not null,
  recipient_id uuid not null,
  alert_kind text not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  primary key (task_id, recipient_id, alert_kind, due_date)
);
alter table public.recruitment_sla_alert_log enable row level security;
revoke all on public.recruitment_sla_alert_log from anon, authenticated;

create or replace function public.generate_recruitment_sla_alerts()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  t record;
  recipient uuid;
  kind text;
  count_sent integer := 0;
  title_text text;
  message_text text;
begin
  -- Only service-role/scheduled invocations may execute this function.
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required';
  end if;
  for t in
    select id, title, company_id, assigned_to, created_by, due_date, priority,
      (due_date::date - current_date) as days_left
    from public.recruitment_tasks
    where status <> 'completed'
      and due_date is not null
      and company_id is not null
      and due_date::date <= current_date + 3
  loop
    kind := case when t.days_left < 0 then 'overdue' when t.days_left = 0 then 'due_today' else 'due_soon' end;
    title_text := case when kind = 'overdue' then 'SLA Breached: ' when kind = 'due_today' then 'Task Due Today: ' else 'SLA Warning: ' end || left(t.title, 160);
    message_text := 'Recruitment task "' || left(t.title, 160) || '" is ' ||
      case when kind = 'overdue' then abs(t.days_left)::text || ' day(s) overdue.'
      when kind = 'due_today' then 'due today.'
      else 'due in ' || t.days_left::text || ' day(s).' end;
    -- Notify assigned recruiter, plus active HR managers in the task company.
    for recipient in
      select distinct m.user_id
      from public.company_members m
      where m.company_id = t.company_id
        and (m.user_id = t.assigned_to or m.role in ('admin','hr_manager'))
    loop
      if not exists (
        select 1 from public.recruitment_sla_alert_log l
        where l.task_id = t.id::text and l.recipient_id = recipient
          and l.alert_kind = kind and l.due_date = t.due_date::date
      ) then
        insert into public.notifications
          (company_id, recipient_id, title, message, type, priority, action_url)
        values
          (t.company_id, recipient, title_text, message_text, 'team',
           case when kind = 'overdue' then 'high' else 'medium' end,
           '/app/recruitment-operations/tasks');
        insert into public.recruitment_sla_alert_log(task_id,recipient_id,alert_kind,due_date)
          values (t.id::text,recipient,kind,t.due_date::date);
        count_sent := count_sent + 1;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('created',count_sent);
end;
$$;
revoke all on function public.generate_recruitment_sla_alerts() from public, anon, authenticated;
grant execute on function public.generate_recruitment_sla_alerts() to service_role;

-- Schedule the RPC from a trusted server daily (not from the browser).
