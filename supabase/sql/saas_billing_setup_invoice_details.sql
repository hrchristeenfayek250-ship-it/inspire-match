-- Setup invoice draft billing contact metadata. No payment or tax invoice issuance.
begin;
alter table public.billing_setup_invoices
 add column if not exists bill_to_name text,
 add column if not exists bill_to_email text,
 add column if not exists bill_to_address text,
 add column if not exists bill_to_tax_id text,
 add column if not exists tax_treatment text not null default 'pending_review',
 add column if not exists billing_notes text not null default '';

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
 returning id into v_id;
 if v_id is null then raise exception 'No editable setup invoice draft'; end if;
 return jsonb_build_object('id',v_id,'status','draft');
end;
$$;
revoke all on function public.billing_save_setup_invoice_details(uuid,text,text,text,text,text)
 from public,anon;
grant execute on function public.billing_save_setup_invoice_details(uuid,text,text,text,text,text)
 to authenticated;
commit;
