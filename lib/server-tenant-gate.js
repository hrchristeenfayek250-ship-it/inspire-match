import { createClient } from "@supabase/supabase-js";

// Server-side tenant approval check for interactive ATS API routes.
// Uses the caller's own access token (never a service-role key).
// A valid session is not enough: membership and the database activation
// gate must both pass before invoking paid AI services.
export async function requireApprovedTenant(request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    if (!match?.[1]) return false;

    const token = match[1].trim();
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );

    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth?.user?.id) return false;

    // Explicitly reject ambiguous multiple-workspace requests; the existing
    // client AI API contract does not pass a selected company_id.
    const { data: access, error: gateError } = await db.rpc(
      "billing_my_tenant_entry_gate"
    );

    return !gateError && access?.allowed === true;
  } catch (error) {
    console.error("Tenant API access verification failed:", error);
    return false;
  }
}
