# Inspire Match ATS — Paymob billing configuration

Status: **foundation implemented; live payments not enabled**.

## Already included

- Company-scoped plans, approved prices, subscriptions, checkout sessions, invoices and payments.
- Admin-only billing view and subscription cancellation preferences.
- Server-side Paymob intention creation and Hosted Unified Checkout redirect.
- Signed transaction callback (HMAC SHA-512) and idempotent payment recording.

## Deployment sequence

1. Apply `supabase/sql/saas_billing_foundation.sql` in Supabase.
2. Apply `supabase/sql/saas_billing_subscription_management.sql` for self-service preferences.
3. Approve actual plan prices, legal terms, tax treatment and merchant settlement country **before** activating any price.
4. Create/approve a Paymob merchant account for the country. Region is chosen by the merchant credentials, not by the customer's billing currency selector.
5. Add **server-side** Vercel environment variables:

| Variable | Example / use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service role key; **never use in browser or commit** |
| `PAYMOB_REGION` | `EGY`, `KSA`, `UAE` or `OMN` |
| `PAYMOB_MODE` | `test` while onboarding; `live` only after signoff |
| `PAYMOB_SECRET_KEY` | Paymob secret key for same region/mode |
| `PAYMOB_PUBLIC_KEY` | Paymob public key for same region/mode |
| `PAYMOB_INTEGRATION_ID_CARD` | Card integration ID approved for this account/mode |
| `PAYMOB_HMAC_SECRET` | Paymob transaction callback HMAC secret |
| `APP_URL` | `https://inspire-match-ats.vercel.app` (no trailing slash) |

6. Register the callback URL with Paymob or confirm the intention's `notification_url` reaches `https://inspire-match-ats.vercel.app/api/billing/paymob/webhook`.
7. After payment provider approval, agree on checkout currencies and subscription prices. Publish rows in `billing_plan_prices` using approved minor-unit amounts only.
8. Carry out **test-mode** payments and callback/security reconciliation in the pre-launch QA phase, then enable live credentials once they pass.

## Security and commercial limitations

- The browser **never** writes invoices, payments or subscription statuses.
- A successful browser redirect **does not** activate a subscription. A verified callback is required.
- Existing backend assumes **one merchant account per deployment**. Selling in multiple countries under different Paymob regional accounts requires country-specific routing and merchant configuration before going live.
- Prices are not defined here; do not enable live checkout with arbitrary example amounts.
- Payments currently represent **one-off checkout transactions**, not automatic recurring billing.
- The cancellation preference is recorded, but does not automatically cancel a Paymob recurring mandate (there is no such mandate in this implementation).
- Feature limits are planned but **not enforced** by the ATS yet; do not market tiers as actively restricted.
- Invoice records are internal accounting entries, not downloadable VAT-compliant tax invoices.
- Expiration is reflected in the UI according to `current_period_end`; a scheduled lifecycle job and access enforcement are still required before production rollout.
- Rollout must account for local tax invoices, data protection, settlement agreements and customer terms.

## References

- Paymob API: https://developers.paymob.com/paymob-docs/intention-apis/create-intention
- Paymob transaction callbacks: https://developers.paymob.com/paymob-docs/developers/transaction-callbacks
- Hosted checkout flow: https://developers.paymob.com/paymob-docs/integration-paths/apis
