-- Inspire Match | Internal contract review and signature evidence tracking
-- Requires saas_sales_contracts_foundation.sql. No external signing or activation.
begin;
create table if not exists public.billing_sales_contract_events (
 id uuid primary key default gen_random_uuid(),
 contract_id uuid not null references public.billing_sales_contracts(id) on delete restrict,
 action text not null check(action in ('submit_legal','request_changes','approve_legal','record_signature')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 document_reference text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_sales_contract_events_contract_idx
 on public.billing_sales_contract_events(contract_id,created_at desc);
alter table public.billing_sales_contract_events enable row level security;
revoke all on public.billing_sales_contract_events from public,anon,authenticated;
grant select on public.billing_sales_contract_events to authenticated;
drop policy if exists billing_sales_contract_events_read on public.billing_sales_contract_events;
create policy billing_sales_contract_events_read on public.billing_sales_contract_events
 for select to authenticated using(public.billing_is_internal_staff());

-- Workflow status and signature evidence can only change through the controlled RPC.
create or replace function public.billing_sales_contract_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id or new.proposal_id is distinct from old.proposal_id
   or new.contract_reference is distinct from old.contract_reference
   or new.created_by is distinct from old.created_by then
   raise exception 'Contract identity fields are immutable';
  end if;
  if coalesce(current_setting('app.contract_workflow_rpc',true),'')<>'authorized'
   and (new.status is distinct from old.status
    or new.signed_at is distinct from old.signed_at
    or new.signed_document_reference is distinct from old.signed_document_reference) then
   raise exception 'Contract workflow and signature evidence require an internal review action';
  end if;
 end if;
 new.updated_at=now();
 return new;
end;
$$;

create or replace function public.billing_sales_contract_action(
 p_contract_id uuid,
 p_action text,
 p_comment text default '',
 p_document_reference text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v public.billing_sales_contracts%rowtype;
 v_role text;
 v_new_status text;
 v_comment text:=btrim(coalesce(p_comment,''));
 v_doc text:=btrim(coalesce(p_document_reference,''));
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select s.staff_role into v_role from public.billing_internal_staff s
 where s.user_id=auth.uid() and s.is_active=true;
 if v_role is null then raise exception 'Approved internal staff required' using errcode='42501'; end if;
 if p_action not in ('submit_legal','request_changes','approve_legal','record_signature') then
  raise exception 'Unsupported contract action';
 end if;
 select * into v from public.billing_sales_contracts where id=p_contract_id for update;
 if not found then raise exception 'Contract not found'; end if;

 if p_action='submit_legal' then
  if v_role not in ('sales','platform_admin') or v.status<>'draft' then
   raise exception 'Only Sales can submit a draft for legal review';
  end if;
  if length(btrim(v.legal_entity_name))<2 then raise exception 'Legal entity name required'; end if;
  v_new_status:='legal_review';
 elsif p_action='request_changes' then
  if v_role<>'platform_admin' or v.status<>'legal_review' then
   raise exception 'Platform Admin legal review permission required';
  end if;
  if v.created_by=auth.uid() or v.updated_by=auth.uid() then
   raise exception 'You cannot review a contract you created or submitted' using errcode='42501';
  end if;
  if length(v_comment)<3 then raise exception 'Reason for changes required'; end if;
  v_new_status:='draft';
 elsif p_action='approve_legal' then
  if v_role<>'platform_admin' or v.status<>'legal_review' then
   raise exception 'Platform Admin legal review permission required';
  end if;
  if v.created_by=auth.uid() or v.updated_by=auth.uid() then
   raise exception 'You cannot approve a contract you created or submitted' using errcode='42501';
  end if;
  v_new_status:='ready_for_signature';
 else
  if v_role<>'platform_admin' or v.status<>'ready_for_signature' then
   raise exception 'Platform Admin signature recording permission required';
  end if;
  if length(v_doc)<8 then raise exception 'Signed document reference is required (minimum 8 characters)'; end if;
  if length(v_comment)<8 then raise exception 'Enter a note explaining how the signed document was verified'; end if;
  v_new_status:='signed';
 end if;
 perform set_config('app.contract_workflow_rpc','authorized',true);
 update public.billing_sales_contracts set status=v_new_status,
  signed_at=case when p_action='record_signature' then now() else signed_at end,
  signed_document_reference=case when p_action='record_signature' then left(v_doc,500) else signed_document_reference end,
  updated_by=auth.uid()
 where id=p_contract_id;
 insert into public.billing_sales_contract_events(contract_id,action,actor_id,comment,document_reference)
 values(p_contract_id,p_action,auth.uid(),left(v_comment,3000),
  case when p_action='record_signature' then left(v_doc,500) else '' end);
 return jsonb_build_object('id',p_contract_id,'status',v_new_status);
end;
$$;
revoke all on function public.billing_sales_contract_action(uuid,text,text,text) from public,anon;
grant execute on function public.billing_sales_contract_action(uuid,text,text,text) to authenticated;
commit;