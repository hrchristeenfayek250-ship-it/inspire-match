-- Inspire Match ATS / Billing subscription self-service lifecycle (v2)
-- Run after supabase/sql/saas_billing_foundation.sql
-- This records explicit "do not renew" preferences; Paymob recurring billing is not yet enabled.
-- Subscriptions remain valid until their paid period end.

create table if not exists public.billing_subscription_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 action text not null check (action in ('cancel_at_period_end','resume_renewal')),
 plan_id text not null references public.billing_plans(id),
 effective_period_end timestamptz not null,
 created_at timestamptz not null default now()
);

create index if not exists billing_subscription_events_company_idx
  on public.billing_subscription_events (company_id, created_at desc);
alter table public.billing_subscription_events enable row level security;

drop policy if exists billing_subscription_events_admin_read on public.billing_subscription_events;
create policy billing_subscription_events_admin_read on public.billing_subscription_events
 for select to authenticated
 using (exists (
   select 1 from public.company_members m
    where m.company_id=billing_subscription_events.company_id
      and m.user_id=auth.uid() and m.role='admin'
 ));

-- Company admins can only change the cancellation preference, never plan,
-- billing status, invoice, paid dates, provider or price.
create or replace function public.billing_set_cancel_at_period_end(
 p_company_id uuid, p_cancel boolean
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_sub public.company_subscriptions%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in to manage billing'; end if;
 if p_company_id is null or p_cancel is null then raise exception 'Missing company or action'; end if;
 if not exists(select 1 from public.company_members m
   where m.company_id=p_company_id and m.user_id=auth.uid() and m.role='admin') then
   raise exception 'Only company admins can manage subscriptions';
 end if;

 select * into v_sub from public.company_subscriptions
 where company_id=p_company_id for update;

 if not found then raise exception 'No subscription found for this company'; end if;
 if v_sub.status not in ('active','trialing')
   or v_sub.current_period_end is null
   or v_sub.current_period_end <= now()
   then raise exception 'This subscription has no active period to manage';
 end if;

 if v_sub.cancel_at_period_end is distinct from p_cancel then
   update public.company_subscriptions
     set cancel_at_period_end=p_cancel,updated_at=now()
     where company_id=p_company_id;
   insert into public.billing_subscription_events (
     company_id,actor_id,action,plan_id,effective_period_end
   ) values (
     p_company_id,auth.uid(),
     case when p_cancel then 'cancel_at_period_end' else 'resume_renewal' end,
     v_sub.plan_id,v_sub.current_period_end
   );
 end if;
 return jsonb_build_object(
   'company_id',p_company_id,
   'cancel_at_period_end',p_cancel,
   'period_end',v_sub.current_period_end,
   'plan_id',v_sub.plan_id
 );
end $$;

revoke all on function public.billing_set_cancel_at_period_end(uuid,boolean) from public,anon;
grant execute on function public.billing_set_cancel_at_period_end(uuid,boolean) to authenticated;

-- Recurring charges are NOT implemented. Do not describe "resume renewal" as
-- a guaranteed automatic charge; this preference is for future renewal handling.
