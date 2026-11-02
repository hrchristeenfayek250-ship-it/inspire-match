-- Inspire Match ATS | Private contract approval and signature-evidence tracking
-- Run AFTER saas_sales_contracts_foundation.sql.
-- This is an internal record of external signatures, NOT an e-signature service,
-- contract execution, customer activation, payment or tax invoicing.
begin;

-- Explicit legal reviewers may be enrolled only by trusted database operators.
alter table public.billing_internal_staff
 drop constraint if exists billing_internal_staff_staff_role_check;
alter table public.billing_internal_staff
 add constraint billing_internal_staff_staff_role_check
 check (staff_role in ('sales','finance','legal','platform_admin'));

alter table public.billing_sales_contracts
 add column if not exists legal_reviewed_by uuid references auth.users(id),
 add column if not exists legal_reviewed_at timestamptz,
 add column if not exists client_signatory_name text not null default '',
 add column if not exists vendor_signatory_name text not null default '',
 add column if not exists signature_date date,
 add column if not exists signature_verified_by uuid references auth.users(id),
 add column if not exists signature_recorded_at timestamptz;

create table if not exists public.billing_sales_contract_events(
 id uuid primary key default gen_random_uuid(),
 contract_id uuid not null references public.billing_sales_contracts(id) on delete restrict,
 action text not null check(action in ('submit_for_legal','approve_legal','request_changes','record_signature')),
 actor_id uuid not null references auth.users(id),
 comment text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_sales_contract_events_contract_created_idx
 on public.billing_sales_contract_events(contract_id,created_at desc);

alter table public.billing_sales_contract_events enable row level security;
revoke all on public.billing_sales_contract_events from public,anon,authenticated;
grant select on public.billing_sales_contract_events to authenticated;
drop policy if exists billing_sales_contract_events_internal_read on public.billing_sales_contract_events;
create policy billing_sales_contract_events_internal_read
 on public.billing_sales_contract_events for select to authenticated
 using(public.billing_is_internal_staff());

-- Clients cannot update workflow columns directly. Existing column grants still
-- restrict ordinary authenticated users to editable draft fields only.
create or replace function public.billing_sales_contract_guard()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 if tg_op='UPDATE' then
  if new.id is distinct from old.id
    or new.proposal_id is distinct from old.proposal_id
    or new.contract_reference is distinct from old.contract_reference
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
   raise exception 'Contract identity fields are immutable';
  end if;
  if coalesce(current_setting('app.contract_review_rpc',true),'') <> 'authorized' then
   if new.status is distinct from old.status
      or new.legal_reviewed_by is distinct from old.legal_reviewed_by
      or new.legal_reviewed_at is distinct from old.legal_reviewed_at
      or new.signed_at is distinct from old.signed_at
      or new.signed_document_reference is distinct from old.signed_document_reference
      or new.client_signatory_name is distinct from old.client_signatory_name
      or new.vendor_signatory_name is distinct from old.vendor_signatory_name
      or new.signature_date is distinct from old.signature_date
      or new.signature_verified_by is distinct from old.signature_verified_by
      or new.signature_recorded_at is distinct from old.signature_recorded_at then
    raise exception 'Contract workflow changes require the internal approval process';
   end if;
  end if;
 end if;
 new.updated_at=now();
 return new;
end;
$$;

create or replace function public.billing_sales_submit_contract(p_contract_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_contracts%rowtype;
begin
 if auth.uid() is null or not public.billing_sales_can_manage() then
  raise exception 'Authorized Sales or Platform Admin role required' using errcode='42501';
 end if;
 select * into v from public.billing_sales_contracts where id=p_contract_id for update;
 if not found then raise exception 'Contract not found'; end if;
 if v.status <> 'draft' then raise exception 'Only contract drafts can be submitted'; end if;
 if length(btrim(v.legal_entity_name)) < 2 then
  raise exception 'Enter the company legal entity name first';
 end if;
 if not exists(select 1 from public.billing_sales_proposals p where p.id=v.proposal_id and p.status='approved') then
  raise exception 'The linked commercial proposal must remain approved';
 end if;
 perform set_config('app.contract_review_rpc','authorized',true);
 update public.billing_sales_contracts set status='legal_review',updated_by=auth.uid()
 where id=p_contract_id;
 insert into public.billing_sales_contract_events(contract_id,action,actor_id)
 values(p_contract_id,'submit_for_legal',auth.uid());
 return jsonb_build_object('id',p_contract_id,'status','legal_review');
end;
$$;
revoke all on function public.billing_sales_submit_contract(uuid) from public,anon;
grant execute on function public.billing_sales_submit_contract(uuid) to authenticated;

create or replace function public.billing_sales_review_contract(
 p_contract_id uuid,p_decision text,p_comment text default ''
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_contracts%rowtype; v_role text; v_new_status text;
begin
 if auth.uid() is null then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 select staff_role into v_role from public.billing_internal_staff
 where user_id=auth.uid() and is_active;
 if coalesce(v_role,'') not in ('legal','platform_admin') then
  raise exception 'Explicit Legal or Platform Admin role required' using errcode='42501';
 end if;
 if p_decision not in ('approve_legal','request_changes') then
  raise exception 'Unsupported legal decision';
 end if;
 if p_decision='request_changes' and length(btrim(coalesce(p_comment,'')))<3 then
  raise exception 'A legal review reason is required';
 end if;
 select * into v from public.billing_sales_contracts where id=p_contract_id for update;
 if not found then raise exception 'Contract not found'; end if;
 if v.status <> 'legal_review' then raise exception 'Contract is not awaiting legal review'; end if;
 if v.created_by=auth.uid() or v.updated_by=auth.uid() then
  raise exception 'You cannot legally approve a contract that you created or submitted'
   using errcode='42501';
 end if;
 if not exists(select 1 from public.billing_sales_proposals p where p.id=v.proposal_id and p.status='approved') then
  raise exception 'Linked proposal is no longer approved';
 end if;
 v_new_status:=case when p_decision='approve_legal' then 'ready_for_signature' else 'draft' end;
 perform set_config('app.contract_review_rpc','authorized',true);
 update public.billing_sales_contracts set
  status=v_new_status,
  legal_reviewed_by=case when p_decision='approve_legal' then auth.uid() else null end,
  legal_reviewed_at=case when p_decision='approve_legal' then now() else null end,
  updated_by=auth.uid()
 where id=p_contract_id;
 insert into public.billing_sales_contract_events(contract_id,action,actor_id,comment)
 values(p_contract_id,p_decision,auth.uid(),left(coalesce(p_comment,''),3000));
 return jsonb_build_object('id',p_contract_id,'status',v_new_status);
end;
$$;
revoke all on function public.billing_sales_review_contract(uuid,text,text) from public,anon;
grant execute on function public.billing_sales_review_contract(uuid,text,text) to authenticated;

-- Only records a verified external signature. No documents uploaded, signed
-- or sent by this function. The exact signed file must exist in private storage.
create or replace function public.billing_sales_record_signature(
 p_contract_id uuid,
 p_signed_date date,
 p_document_reference text,
 p_client_signatory text,
 p_vendor_signatory text
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.billing_sales_contracts%rowtype; v_role text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select staff_role into v_role from public.billing_internal_staff
 where user_id=auth.uid() and is_active;
 if coalesce(v_role,'') not in ('legal','platform_admin') then
  raise exception 'Explicit Legal or Platform Admin role required' using errcode='42501';
 end if;
 if p_signed_date is null or p_signed_date > current_date then
  raise exception 'Provide the actual signing date, not a future date';
 end if;
 if length(btrim(coalesce(p_document_reference,'')))<5
    or length(btrim(coalesce(p_client_signatory,'')))<2
    or length(btrim(coalesce(p_vendor_signatory,'')))<2 then
  raise exception 'Signed document reference and both signatory names are required';
 end if;
 select * into v from public.billing_sales_contracts where id=p_contract_id for update;
 if not found then raise exception 'Contract not found'; end if;
 if v.status <> 'ready_for_signature' or v.legal_reviewed_by is null then
  raise exception 'Legal approval is required before recording signatures';
 end if;
 if v.created_by=auth.uid() then
  raise exception 'Contract creator cannot verify the signature' using errcode='42501';
 end if;
 if not exists(select 1 from public.billing_sales_proposals p where p.id=v.proposal_id and p.status='approved') then
  raise exception 'The commercial proposal is not approved';
 end if;
 perform set_config('app.contract_review_rpc','authorized',true);
 update public.billing_sales_contracts set
  status='signed',
  signed_at=(p_signed_date::timestamp at time zone 'UTC'),
  signed_document_reference=left(btrim(p_document_reference),500),
  client_signatory_name=left(btrim(p_client_signatory),200),
  vendor_signatory_name=left(btrim(p_vendor_signatory),200),
  signature_date=p_signed_date,
  signature_verified_by=auth.uid(),
  signature_recorded_at=now(),
  updated_by=auth.uid()
 where id=p_contract_id;
 insert into public.billing_sales_contract_events(contract_id,action,actor_id,comment)
 values(p_contract_id,'record_signature',auth.uid(),'External signed document reference recorded (private).');
 return jsonb_build_object('id',p_contract_id,'status','signed','signature_date',p_signed_date);
end;
$$;
revoke all on function public.billing_sales_record_signature(uuid,date,text,text,text) from public,anon;
grant execute on function public.billing_sales_record_signature(uuid,date,text,text,text) to authenticated;
commit;
