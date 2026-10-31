# Inspire Match ATS — Paymob billing configuration

Status: **foundation implemented; live payments not enabled**.

## Already included

- Company-scoped plans, approved prices, subscriptions, checkout sessions, invoices and payments.
- Admin-only billing view and subscription cancellation preferences.
- One-time setup fee **drafts**, one per company, created by company admins from approved offers; no setup-fee payment, tax invoice, or subscription activation yet.
- Restricted finance review queue for setup drafts, with approve/request-changes decisions, reviewer audit events, and customer draft editing locks.
- Server-side Paymob intention creation and Hosted Unified Checkout redirect.
- Signed transaction callback (HMAC SHA-512) and idempotent payment recording.

## Deployment sequence

1. Apply `supabase/sql/saas_billing_foundation.sql` in Supabase.
2. Apply `supabase/sql/saas_billing_subscription_management.sql` for self-service preferences.
3. Apply `supabase/sql/saas_billing_plan_entitlements.sql`, `supabase/sql/saas_billing_access_snapshot.sql` and `supabase/sql/billing_currency_usd.sql` for feature catalog, access snapshot and USD pricing catalog. The USD migration also creates the draft commercial offers table if missing.
4. Apply `supabase/sql/saas_billing_setup_invoice_drafts.sql` for separate internal setup-fee drafts (no payments).
5. Apply `supabase/sql/saas_billing_setup_invoice_details.sql`, `supabase/sql/saas_billing_setup_invoice_review.sql`, and `supabase/sql/saas_billing_finance_review.sql` in that order for billing identity, submitted-review state, and the restricted finance queue.
6. Approve actual setup fees and recurring fees, legal terms, tax treatment and merchant settlement country **before** activating any price.
7. Create/approve a Paymob merchant account for the country. Region is chosen by the merchant credentials, not by the customer's billing currency selector.
8. Add **server-side** Vercel environment variables:

| Variable | Example / use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service role key; **never use in browser or commit** |
| `PAYMOB_REGION` | `EGY`, `KSA` or `UAE` |
| `PAYMOB_MODE` | `test` while onboarding; `live` only after signoff |
| `PAYMOB_SECRET_KEY` | Paymob secret key for same region/mode |
| `PAYMOB_PUBLIC_KEY` | Paymob public key for same region/mode |
| `PAYMOB_INTEGRATION_ID_CARD` | Card integration ID approved for this account/mode |
| `PAYMOB_HMAC_SECRET` | Paymob transaction callback HMAC secret |
| `APP_URL` | `https://inspire-match-ats.vercel.app` (no trailing slash) |

9. Register the callback URL with Paymob or confirm the intention's `notification_url` reaches `https://inspire-match-ats.vercel.app/api/billing/paymob/webhook`.
10. After payment provider approval, agree on checkout currencies and subscription prices. Approved rows in `billing_commercial_offers` must match active recurring prices in `billing_plan_prices` before checkout is allowed. Nonzero setup fees are displayed, but require a separate, not-yet-implemented checkout.
11. Carry out **test-mode** payments and callback/security reconciliation in the pre-launch QA phase, then enable live credentials once they pass.

## Setup invoice finance review

The company administrator prepares the draft and submits it from `/app/billing`. Only an explicitly provisioned finance reviewer can open `/app/billing/finance` and approve the internal review or request corrections. The reviewer queue and decisions use checked SECURITY DEFINER RPCs; company-admin membership alone is **not** enough.

The `billing_finance_reviewers` allowlist starts **empty** and is never automatically populated. A trusted database operator must verify a finance staff user's UUID in `auth.users` and explicitly provision that user, separately from the submitting customer account. The original draft creator cannot approve their own submission. Do not add every company admin or make this a self-service grant.

Once the separate finance reviewer approves a submitted setup draft, its existing print preview at `/app/billing/setup-invoice/[id]` becomes a **Proforma** view with a reference beginning `PF-` and the recorded finance review date. This is still **not** an official tax invoice, payable bill, or receipt; tax, settlement details, and issuance remain disabled.

All decisions are written to `billing_setup_review_events`. Submitted invoice amounts and billing identity are protected against edits; returned drafts may be corrected and resubmitted. Approval changes only `review_status`, **not** the invoice's `status`, and does not trigger payments, subscriptions, VAT calculations, or official tax invoice issuance.

## Security and commercial limitations

- The browser **never** writes invoices, payments or subscription statuses.
- A successful browser redirect **does not** activate a subscription. A verified callback is required.
- Existing backend assumes **one merchant account per deployment**. Selling in multiple countries under different Paymob regional accounts requires country-specific routing and merchant configuration before going live.
- Prices are not defined here; do not enable live checkout with arbitrary example amounts.
- Payments currently represent **one-off checkout transactions**, not automatic recurring billing.
- **Commercial offer approval is mandatory for any checkout**; a recurring fee mismatch or nonzero setup fee prevents checkout. The UI displays approved setup and recurring pricing but does not collect setup fees.
- **USD is pricing-display only** until an eligible merchant configuration is approved for USD acceptance and settlement. The current region configuration covers EGP, SAR and AED only.
- The cancellation preference is recorded, but does not automatically cancel a Paymob recurring mandate (there is no such mandate in this implementation).
- Feature limits are planned but **not enforced** by the ATS yet; do not market tiers as actively restricted.
- Invoice records are internal accounting entries, not downloadable VAT-compliant tax invoices.
- Setup invoice drafts are deliberately separate from subscription invoices. Only an approved commercial offer with a positive setup fee can generate a company draft; one company cannot have multiple separate setup invoices. An issued/paid draft cannot be overwritten by an admin action.
- Expiration is reflected in the UI according to `current_period_end`; a scheduled lifecycle job and access enforcement are still required before production rollout.
- Rollout must account for local tax invoices, data protection, settlement agreements and customer terms.

## References

- Paymob API: https://developers.paymob.com/paymob-docs/intention-apis/create-intention
- Paymob transaction callbacks: https://developers.paymob.com/paymob-docs/developers/transaction-callbacks
- Hosted checkout flow: https://developers.paymob.com/paymob-docs/integration-paths/apis
