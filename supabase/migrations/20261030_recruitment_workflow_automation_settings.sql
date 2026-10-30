-- Inspire Match ATS | Recruitment Workflow Automation Settings + stage trigger correction
-- Run once in Supabase SQL Editor. Creates configurable per-company rules.
-- The live Candidate Pipeline changes candidates.status; interviews also change applications.stage.
BEGIN;

CREATE TABLE IF NOT EXISTS public.recruitment_automation_rules (
  company_id uuid NOT NULL,
  stage text NOT NULL CHECK (stage IN ('screening','interview','shortlisted','hired','rejected')),
  enabled boolean NOT NULL DEFAULT true,
  days_to_due integer NOT NULL DEFAULT 2 CHECK (days_to_due BETWEEN 0 AND 30),
  priority text NOT NULL DEFAULT 'high' CHECK (priority IN ('low','medium','high','urgent')),
  task_title text NOT NULL CHECK (char_length(btrim(task_title)) BETWEEN 4 AND 180),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id,stage)
);

ALTER TABLE public.recruitment_automation_rules ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recruitment_automation_rules TO authenticated;

DROP POLICY IF EXISTS "automation_rules_read_company" ON public.recruitment_automation_rules;
CREATE POLICY "automation_rules_read_company" ON public.recruitment_automation_rules
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.company_members cm
          WHERE cm.company_id = recruitment_automation_rules.company_id
            AND cm.user_id = auth.uid())
);

DROP POLICY IF EXISTS "automation_rules_manage_company" ON public.recruitment_automation_rules;
CREATE POLICY "automation_rules_manage_company" ON public.recruitment_automation_rules
FOR ALL TO authenticated
USING (public.can_manage_recruitment_tasks(company_id))
WITH CHECK (
  public.can_manage_recruitment_tasks(company_id)
  AND (updated_by IS NULL OR updated_by = auth.uid())
);

CREATE OR REPLACE FUNCTION public.automate_recruitment_stage_tasks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := to_jsonb(OLD);
  v_stage text;
  v_old_stage text;
  v_company uuid;
  v_actor uuid := auth.uid();
  v_candidate bigint;
  v_job bigint;
  v_title text;
  v_days integer;
  v_key text;
  v_priority text;
  v_enabled boolean;
  v_log_key text;
  v_exists boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  -- Use the actual stage field for each hiring flow.
  IF TG_TABLE_NAME = 'candidates' THEN
    v_stage := lower(btrim(coalesce(v_new->>'status','')));
    v_old_stage := lower(btrim(coalesce(v_old->>'status','')));
  ELSIF TG_TABLE_NAME = 'applications' THEN
    v_stage := lower(btrim(coalesce(v_new->>'stage','')));
    v_old_stage := lower(btrim(coalesce(v_old->>'stage','')));
  ELSE
    RETURN NEW;
  END IF;
  IF v_stage = v_old_stage OR
     v_stage NOT IN ('screening','interview','shortlisted','hired','rejected') THEN
    RETURN NEW;
  END IF;

  -- Do not generate tasks for anonymous actions or legacy records with no tenant.
  IF v_actor IS NULL OR nullif(v_new->>'company_id','') IS NULL THEN RETURN NEW; END IF;
  v_company := (v_new->>'company_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.company_members cm
                 WHERE cm.company_id = v_company AND cm.user_id = v_actor) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'applications' THEN
    IF coalesce(v_new->>'candidate_id','') !~ '^[0-9]+$' THEN RETURN NEW; END IF;
    v_candidate := (v_new->>'candidate_id')::bigint;
  ELSE
    IF coalesce(v_new->>'id','') !~ '^[0-9]+$' THEN RETURN NEW; END IF;
    v_candidate := (v_new->>'id')::bigint;
  END IF;
  IF coalesce(v_new->>'job_id','') ~ '^[0-9]+$' THEN
    v_job := (v_new->>'job_id')::bigint;
  END IF;

  CASE v_stage
    WHEN 'screening' THEN
      v_title:='Complete candidate screening and record findings';v_days:=2;v_priority:='high';
    WHEN 'interview' THEN
      v_title:='Coordinate interview schedule and interviewer feedback';v_days:=2;v_priority:='high';
    WHEN 'shortlisted' THEN
      v_title:='Follow up with hiring manager on shortlisted candidate';v_days:=2;v_priority:='high';
    WHEN 'hired' THEN
      v_title:='Complete hiring handoff and documentation';v_days:=3;v_priority:='medium';
    WHEN 'rejected' THEN
      v_title:='Complete candidate closure and communication';v_days:=2;v_priority:='medium';
  END CASE;

  SELECT r.enabled, r.days_to_due, r.priority, r.task_title
    INTO v_enabled,v_days,v_priority,v_title
  FROM public.recruitment_automation_rules r
  WHERE r.company_id=v_company AND r.stage=v_stage;
  IF FOUND AND v_enabled IS NOT TRUE THEN RETURN NEW; END IF;

  -- One task per candidate, company, stage and linked job, even when both paths update.
  v_key := v_stage;
  v_log_key := v_key || ':' || coalesce(v_job::text,'none');
  INSERT INTO public.recruitment_stage_automation_log
    (candidate_id,company_id,stage,task_key)
  VALUES (v_candidate::text,v_company,v_stage,v_log_key)
  ON CONFLICT DO NOTHING;

  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.recruitment_tasks
    (title,description,status,priority,due_date,company_id,created_by,
     assigned_to,job_id,candidate_id,updated_at)
  VALUES
    (v_title,'Automatic task for candidate stage: '||initcap(v_stage),
     'todo',v_priority,current_date+v_days,v_company,v_actor,
     v_actor,v_job,v_candidate,now());
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A task automation issue must not block candidate hiring decisions.
  RAISE WARNING 'Recruitment automation skipped (%): %',TG_TABLE_NAME,SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_automate_recruitment_stage_tasks ON public.candidates;
CREATE TRIGGER trg_automate_recruitment_stage_tasks
AFTER UPDATE OF status ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.automate_recruitment_stage_tasks();

DROP TRIGGER IF EXISTS trg_automate_recruitment_stage_tasks_applications ON public.applications;
CREATE TRIGGER trg_automate_recruitment_stage_tasks_applications
AFTER UPDATE OF stage ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.automate_recruitment_stage_tasks();

REVOKE ALL ON FUNCTION public.automate_recruitment_stage_tasks() FROM PUBLIC,anon,authenticated;
COMMIT;
