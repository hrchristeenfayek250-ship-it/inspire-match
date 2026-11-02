# Inspire Match ATS — Private Sales-Led Billing

**Approved business direction (02 November 2026):** Sales-Led B2B SaaS, Private Pricing, Invitation-Based Client Onboarding. Hybrid commercial structure: Core ATS + optional premium add-ons (technical foundation; final package terms still subject to approval).

**Current status:** Billing infrastructure exists. Live payments are disabled. Client self-service plan selection and checkout are disabled. The public landing page and signup restrictions are future phases; current ATS features remain in place.

## Commercial access model

- **Public visitor:** no pricing, subscription packages, billing management, online checkout or direct purchases.
- **Company administrator:** `/app/billing` shows only the company's subscription status, contracted-feature snapshot and own billing/payment records. No catalog, comparisons, or Paymob purchase.
- **Internal Sales & Finance:** `/app/billing/internal` shows private commercial offers and company/subscription summaries via an access-controlled RPC. This phase is read-only.
- **Finance reviewer:** `/app/billing/finance` reviews submitted setup drafts, subject to a separate allowlist and anti-self-approval checks already in the review workflow.
- **Ordinary HR/recruiter:** has no company financial-data access. Visibility of the Billing navigation link is role-filtered, and data access must always be enforced in Supabase.

Internal staff access is based on explicitly allowlisted `billing_internal_staff` users (sales, finance, platform_admin) **or** existing explicitly verified `billing_finance_reviewers`. Being a tenant admin never grants access to internal pricing. Never add all tenant admins to either allowlist.

## Applied SQL migrations / rollout order

1. `supabase/sql/saas_billing_foundation.sql`
2. `supabase/sql/saas_billing_subscription_management.sql`
3. `supabase/sql/saas_billing_plan_entitlements.sql`
4. `supabase/sql/saas_billing_access_snapshot.sql`
5. `supabase/sql/billing_currency_usd.sql`
6. `supabase/sql/saas_billing_setup_invoice_drafts.sql`
7. `supabase/sql/saas_billing_setup_invoice_details.sql`
8. `supabase/sql/saas_billing_setup_invoice_review.sql`
9. `supabase/sql/saas_billing_finance_review.sql`
10. `supabase/sql/saas_billing_sales_led_hybrid.sql`
11. **Next:** `supabase/sql/saas_billing_private_sales_split.sql`

Do not rerun already-applied files simply to install the next one. The private-sales migration moves pricing read policies to internal-only, restricts company-visible plan data to the contracted plan, and replaces customer-controlled setup-draft/cancellation RPC permissions with reserved future internal workflows.

**Historical records are preserved.** This migration does not automatically activate or suspend any company, send invitations, edit jobs, calculate taxes, collect money, or enforce subscription entitlements.

## Internal commercial data

- `billing_plans`, `billing_plan_prices`, `billing_commercial_offers`: internal offer catalog. Prices must never be seeded or published based on preliminary example numbers.
- `billing_internal_staff`: trusted staff allowlist; no records are inserted automatically. Existing `billing_finance_reviewers` remain authorized finance users.
- `billing_internal_overview()`: authenticated staff-only read-only operational summary with private offers and company subscription references.
- `billing_company_feature_overrides`: future company-level optional modules.
- `billing_company_activation`: staged company activation records; **not yet enforced** against ATS routes.
- `billing_my_hybrid_access_snapshot(company_id)`: membership-checked informational snapshot; `enforcement_enabled=false`.

**Important:** The service-provider sales team's ability to create/edit offers, issue drafts, assign company subscriptions, approve activation, and apply feature entitlements is still to be built. No client-self-service write access should be added as a shortcut.

## Finance review, proforma and compliance

Setup drafts and their printable Proforma preview are **internal** commercial documents after the private-sales migration. Finance review decisions record events in `billing_setup_review_events`. An approved Proforma remains **not** an official invoice, VAT invoice, receipt or payment demand.

Legal identity, tax-registration requirements, merchant terms and invoice compliance must be reviewed with qualified professionals before commercial activation. Hiding prices is not a legal exemption.

## Paymob integration

The repository retains Paymob foundations for future authorized checkout. But:

- `POST /api/billing/checkout` returns **403** (direct customer checkout denied).
- `billing_start_checkout` is disabled for `authenticated` users in the hybrid foundation.
- `POST /api/billing/paymob/webhook` rejects **live** processing; the current code supports only configured test-mode callback processing.
- No automatic recurring charges or direct customer checkout are currently supported.
- USD is a private pricing display currency pending merchant support and compliance verification.
- **Never deploy live credentials or mark a subscription paid solely from a browser redirect.**

For future test configuration only, all secrets remain server-side in Vercel, never in the browser or Git:
`SUPABASE_SERVICE_ROLE_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`,
`PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID_CARD`,
`PAYMOB_REGION`, `PAYMOB_MODE=test`, `APP_URL`.

Payment notification verification, transaction-ID ownership, renewal idempotency, tax compliance and RLS must be audited before enabling any real charges. The webhook/payment code is not yet considered production-approved.

## Deferred rollout work

- Internal Sales workflow: leads, demos, proposals, negotiated pricing, approval and contract assignment.
- Authorized internal admin actions for company activation, subscription assignment and tailored add-ons.
- Controlled signup and invitation-only workspace creation, with backend/database enforcement.
- Public marketing landing page with Request Demo / Contact Sales / Existing Client Login.
- Final per-tenant entitlement checks on server and database (not only sidebar visibility).
- End-to-end security review, realistic QA, legal and tax readiness.

**HIRE BETTER. INSPIRE MORE.**
