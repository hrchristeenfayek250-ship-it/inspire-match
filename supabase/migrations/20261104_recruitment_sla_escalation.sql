-- Recruitment SLA escalation, separate from existing due-soon/overdue alerts.
-- Apply in Supabase SQL Editor before deploying the cron integration.
-- Escalates overdue open tasks to company HR managers/admins after 2 and 7 calendar days.
-- No historical data changes; notification delivery depends on the existing notification pipeline.
BEGIN;
CREATE TABLE IF NOT EXISTS public.recruitment_sla_escalation_log (
 task_id uuid NOT NULL,
 company_id uuid NOT NULL,
 recipient_id uuid NOT NULL,
 due_date date NOT NULL,
 escalation_level integer NOT NULL CHECK (escalation_level IN (2,7)),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (task_id,recipient_id,due_date,escalation_level)
);
ALTER TABLE public.recruitment_sla_escalation_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recruitment_sla_escalation_log FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.generate_recruitment_sla_escalations()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
 t record;
 recipient uuid;
 level_days integer;
 sent integer := 0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'Service role required';
 END IF;
 FOR t IN
  SELECT id,title,company_id,due_date::date AS deadline,
   (current_date-due_date::date) AS overdue_days
  FROM public.recruitment_tasks
  WHERE company_id IS NOT NULL AND due_date IS NOT NULL
   AND status <> 'completed' AND due_date::date <= current_date-2
 LOOP
  -- One escalation per level, deadline and recipient. Do not resend daily.
  FOR level_days IN SELECT unnest(ARRAY[2,7]) LOOP
   IF t.overdue_days >= level_days THEN
    FOR recipient IN
     SELECT DISTINCT cm.user_id FROM public.company_members cm
     WHERE cm.company_id=t.company_id AND lower(cm.role) IN ('admin','hr_manager')
    LOOP
     INSERT INTO public.recruitment_sla_escalation_log
      (task_id,company_id,recipient_id,due_date,escalation_level)
     VALUES (t.id,t.company_id,recipient,t.deadline,level_days)
     ON CONFLICT DO NOTHING;
     IF FOUND THEN
      INSERT INTO public.notifications
       (company_id,recipient_id,title,message,type,priority,action_url)
      VALUES
       (t.company_id,recipient,
        'SLA Escalation (Level '||CASE WHEN level_days=2 THEN '1' ELSE '2' END||'): '||left(t.title,120),
        'Recruitment task "'||left(t.title,120)||'" is '||t.overdue_days||
         ' day(s) overdue. Escalation threshold: '||level_days||' days. Please review ownership and blockers.',
        'team','high','/app/recruitment-operations/tasks');
      sent:=sent+1;
     END IF;
    END LOOP;
   END IF;
  END LOOP;
 END LOOP;
 RETURN jsonb_build_object('created',sent);
END;
$fn$;
REVOKE ALL ON FUNCTION public.generate_recruitment_sla_escalations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.generate_recruitment_sla_escalations() TO service_role;
COMMIT;
