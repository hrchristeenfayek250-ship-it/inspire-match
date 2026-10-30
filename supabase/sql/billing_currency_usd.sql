-- Billing currency migration: OMR to USD
-- Run after foundation and commercial offers SQL.
do $$
begin
 if exists(select 1 from public.billing_plan_prices where currency='OMR')
 or exists(select 1 from public.billing_commercial_offers where currency='OMR') then
  raise exception 'Review existing OMR prices before replacing this currency';
 end if;
end $$;
alter table public.billing_plan_prices drop constraint if exists billing_plan_prices_currency_check;
alter table public.billing_plan_prices add constraint billing_plan_prices_currency_check check(currency in ('EGP','SAR','AED','USD'));
alter table public.billing_commercial_offers drop constraint if exists billing_commercial_offers_currency_check;
alter table public.billing_commercial_offers add constraint billing_commercial_offers_currency_check check(currency in ('EGP','SAR','AED','USD'));
