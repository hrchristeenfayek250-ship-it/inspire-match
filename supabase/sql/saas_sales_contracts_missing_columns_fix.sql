-- Inspire Match | Backward-compatible contract signature columns
-- Fix: column billing_sales_contracts.client_signatory_name does not exist
-- Safe additive migration: no contract rows modified, no new privileges.
begin;
alter table public.billing_sales_contracts
 add column if not exists client_signatory_name text not null default '',
 add column if not exists vendor_signatory_name text not null default '',
 add column if not exists signature_date date,
 add column if not exists legal_reviewed_by uuid references auth.users(id),
 add column if not exists legal_reviewed_at timestamptz,
 add column if not exists signature_verified_by uuid references auth.users(id),
 add column if not exists signature_recorded_at timestamptz;
commit;
-- Note: This repairs schema only. Existing separate workflow functions and
-- authorizations remain unchanged. Does NOT mark documents signed or activate billing.
