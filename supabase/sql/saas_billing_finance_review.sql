-- Inspire Match ATS | Financial review of setup fee drafts (phase 1).
-- Apply after saas_billing_setup_invoice_review.sql.
-- Does NOT issue an invoice, activate a subscription, or collect any money.
begin;

-- Membership can only be provisioned by a trusted database operator.
-- IMPORTANT: Do not add all company admins as finance reviewers.
create table if not exists public.billing_finance_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.billing_finance_reviewers enable row level security;
revoke all on public.billing_finance_reviewers from anon, authenticated;

create table if not exists public.billing_setup_review_events (
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.billing_setup_invoices(id) on delete cascade,
 company_id uuid not null references public.companies(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approved','changes_requested')),
 note text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists billing_setup_review_events_invoice_idx
 on public.billing_setup_review_events(invoice_id,created_at desc);
create index if not exists billing_setup_review_queue_idx
 on public.billing_setup_invoices(review_status,submitted_at desc);
alter table public.billing_setup_review_events enable row level security;
revoke all on public.billing_setup_review_events from anon, authenticated;

-- Additional guard against changing any submitted/approved invoice identity or price.
-- Review status/note/timestamps may still change through the finance decision RPC.
create or replace function public.billing_protect_submitted_setup_invoice()
returns trigger language plpgsql set search_path=''
as $$
begin
 if old.review_status in ('pending_review','approved') and (
  new.commercial_offer_id is distinct from old.commercial_offer_id
  or new.company_id is distinct from old.company_id
  or new.plan_id is distinct from old.plan_id
  or new.currency is distinct from old.currency
  or new.billing_interval is distinct from old.billing_interval
  or new.amount_minor is distinct from old.amount_minor
  or new.bill_to_name is distinct from old.bill_to_name
  or new.bill_to_email is distinct from old.bill_to_email
  or new.bill_to_address is distinct from old.bill_to_address
  or new.bill_to_tax_id is distinct from old.bill_to_tax_id
  or new.billing_notes is distinct from old.billing_notes
 ) then
  raise exception 'Submitted or approved invoice details cannot be changed';
 end if;
 return new;
end;
$$;
drop trigger if exists billing_protect_submitted_setup_invoice_trg
 on public.billing_setup_invoices;
create trigger billing_protect_submitted_setup_invoice_trg
before update on public.billing_setup_invoices
for each row execute function public.billing_protect_submitted_setup_invoice();

-- No explicit user list or operator privileges are exposed to normal accounts.
create or replace function public.billing_finance_can_review()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null and exists(
  select 1 from public.billing_finance_reviewers r
  where r.user_id=auth.uid() and r.is_active
 );
$$;
revoke all on function public.billing_finance_can_review() from public,anon;
grant execute on function public.billing_finance_can_review() to authenticated;

-- Reviewer-only, limited access to submitted setup invoice drafts.
create or replace function public.billing_finance_review_queue(p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not exists(
  select 1 from public.billing_finance_reviewers r
  where r.user_id=auth.uid() and r.is_active
 ) then raise exception 'Finance reviewer access required'; end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q) order by q.submitted_at desc),'[]'::jsonb)
 into v_result
 from (
  select i.id, i.company_id, i.plan_id, i.currency, i.billing_interval,
   i.amount_minor, i.status, i.review_status, i.submitted_at,
   i.reviewed_at, i.review_note, i.bill_to_name, i.bill_to_email,
   i.bill_to_address, i.bill_to_tax_id, i.tax_treatment, i.billing_notes
  from public.billing_setup_invoices i
  where i.status='draft' and i.review_status='pending_review'
  order by i.submitted_at desc
  limit least(greatest(coalesce(p_limit,30),1),100)
 ) q;
 return v_result;
end;
$$;
revoke all on function public.billing_finance_review_queue(integer) from public,anon;
grant execute on function public.billing_finance_review_queue(integer) to authenticated;

-- Approval is a FINANCE REVIEW DECISION only. Draft status remains unchanged.
create or replace function public.billing_finance_decide_setup_invoice(
 p_invoice_id uuid, p_decision text, p_note text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_invoice public.billing_setup_invoices%rowtype;
 v_note text := pg_catalog.btrim(coalesce(p_note,''));
begin
 if auth.uid() is null or not exists(
  select 1 from public.billing_finance_reviewers r
  where r.user_id=auth.uid() and r.is_active
 ) then raise exception 'Finance reviewer access required'; end if;
 if p_invoice_id is null or p_decision not in ('approved','changes_requested') then
  raise exception 'Invalid invoice or review decision'; end if;
 if length(v_note)>1000 or (p_decision='changes_requested' and length(v_note)<5) then
  raise exception 'Provide a review note of 5 to 1000 characters for changes'; end if;

 select * into v_invoice from public.billing_setup_invoices
 where id=p_invoice_id for update;
 if not found or v_invoice.status<>'draft'
    or v_invoice.review_status<>'pending_review' then
  raise exception 'Only submitted drafts can be reviewed'; end if;
 if v_invoice.created_by=auth.uid() then
  raise exception 'A reviewer cannot approve or return their own setup draft'; end if;
 if p_decision='approved' then
  if length(pg_catalog.btrim(coalesce(v_invoice.bill_to_name,'')))<2
    or length(pg_catalog.btrim(coalesce(v_invoice.bill_to_email,'')))<5
    or length(pg_catalog.btrim(coalesce(v_invoice.bill_to_address,'')))<5
  then raise exception 'Billing identity is incomplete'; end if;
  if not exists(
   select 1 from public.billing_commercial_offers o
   where o.id=v_invoice.commercial_offer_id and o.status='approved'
   and o.plan_id=v_invoice.plan_id and o.currency=v_invoice.currency
   and o.billing_interval=v_invoice.billing_interval
   and o.setup_fee_minor=v_invoice.amount_minor
  ) then raise exception 'Approved commercial terms changed; request a new review'; end if;
 end if;

 update public.billing_setup_invoices set
  review_status=p_decision, reviewed_at=now(), review_note=nullif(v_note,''),
  updated_at=now()
 where id=v_invoice.id;

 insert into public.billing_setup_review_events
  (invoice_id,company_id,reviewer_id,decision,note)
 values(v_invoice.id,v_invoice.company_id,auth.uid(),p_decision,v_note);

 return pg_catalog.jsonb_build_object('id',v_invoice.id,
  'review_status',p_decision,'invoice_status','draft','charged',false);
end;
$$;
revoke all on function public.billing_finance_decide_setup_invoice(uuid,text,text)
 from public,anon;
grant execute on function public.billing_finance_decide_setup_invoice(uuid,text,text)
 to authenticated;

commit;

-- Finance reviewers are deliberately NOT seeded automatically.
-- A trusted operator must provision them using a verified auth.users UUID.
-- e.g., INSERT INTO public.billing_finance_reviewers(user_id) VALUES ('<VERIFIED_UUID>');
-- Do not run this example with a placeholder or reuse tenant-admin permissions.
