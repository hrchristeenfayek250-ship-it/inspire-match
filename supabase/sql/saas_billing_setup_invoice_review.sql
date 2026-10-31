-- Inspire Match ATS | Setup invoice review workflow
-- Internal draft review only: no issued tax invoices and no payments.
begin;
alter table public.billing_setup_invoices
 add column if not exists review_status text not null default 'not_submitted',
 add column if not exists submitted_at timestamptz,
 add column if not exists reviewed_at timestamptz,
 add column if not exists review_note text;
alter table public.billing_setup_invoices
 drop constraint if exists billing_setup_invoices_review_status_check;
alter table public.billing_setup_invoices
 add constraint billing_setup_invoices_review_status_check
 check(review_status in ('not_submitted','pending_review','changes_requested','approved'));

-- Prevent editing a draft while it awaits finance review.
create or replace function public.billing_save_setup_invoice_details(
 p_company_id uuid, p_name text, p_email text, p_address text,
 p_tax_id text, p_notes text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(
  select 1 from public.company_members m
  where m.company_id=p_company_id and m.user_id=auth.uid() and m.role='admin'
 ) then raise exception 'Company admin access required'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(p_name)>160
 or length(trim(coalesce(p_email,'')))<5 or length(p_email)>254
 or position('@' in p_email)<2 or length(coalesce(p_address,''))>500
 or length(coalesce(p_tax_id,''))>80 or length(coalesce(p_notes,''))>1000
 then raise exception 'Invalid billing contact details'; end if;
 update public.billing_setup_invoices
 set bill_to_name=trim(p_name),bill_to_email=trim(p_email),
 bill_to_address=nullif(trim(coalesce(p_address,'')),''),
 bill_to_tax_id=nullif(trim(coalesce(p_tax_id,'')),''),
 billing_notes=trim(coalesce(p_notes,'')),updated_at=now()
 where company_id=p_company_id and status='draft'
 and review_status in ('not_submitted','changes_requested')
 returning id into v_id;
 if v_id is null then raise exception 'Draft cannot be edited during finance review'; end if;
 return jsonb_build_object('id',v_id,'status','draft');
end;
$$;
revoke all on function public.billing_save_setup_invoice_details(uuid,text,text,text,text,text)
 from public,anon;
grant execute on function public.billing_save_setup_invoice_details(uuid,text,text,text,text,text)
 to authenticated;

create or replace function public.billing_submit_setup_invoice_review(
 p_company_id uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare v_invoice public.billing_setup_invoices%rowtype;
begin
 if auth.uid() is null or not exists(
  select 1 from public.company_members m
  where m.company_id=p_company_id and m.user_id=auth.uid() and m.role='admin'
 ) then raise exception 'Company admin access required'; end if;
 select * into v_invoice from public.billing_setup_invoices
 where company_id=p_company_id for update;
 if not found or v_invoice.status<>'draft' then
  raise exception 'No editable setup invoice draft'; end if;
 if v_invoice.review_status='pending_review' then
  raise exception 'Invoice is already pending review'; end if;
 if v_invoice.review_status='approved' then
  raise exception 'Invoice review already approved'; end if;
 if length(trim(coalesce(v_invoice.bill_to_name,'')))<2
 or length(trim(coalesce(v_invoice.bill_to_email,'')))<5
 or position('@' in v_invoice.bill_to_email)<2
 or length(trim(coalesce(v_invoice.bill_to_address,'')))<5 then
  raise exception 'Complete billing name, email, and address before review'; end if;
 update public.billing_setup_invoices
 set review_status='pending_review',submitted_at=now(),reviewed_at=null,
     review_note=null,updated_at=now()
 where id=v_invoice.id;
 return jsonb_build_object('id',v_invoice.id,'review_status','pending_review');
end;
$$;
revoke all on function public.billing_submit_setup_invoice_review(uuid) from public,anon;
grant execute on function public.billing_submit_setup_invoice_review(uuid) to authenticated;
commit;
-- Approval is intentionally not exposed to tenant users.
-- Finance approval, issuance, and tax policy remain future work.
