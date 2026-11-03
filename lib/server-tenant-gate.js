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
    const { data: memberships, error: memberError } = await db
      .from("company_members")
      .select("company_id")
      .eq("user_id", auth.user.id)
      .limit(2);

    if (memberError || memberships?.length !== 1 || !memberships[0].company_id) {
      return false;
    }

    const { data: enabled, error: gateError } = await db.rpc(
      "billing_company_tenant_enabled",
      { p_company_id: memberships[0].company_id }
    );

    return !gateError && enabled === true;
  } catch (error) {
    console.error("Tenant API access verification failed:", error);
    return false;
  }
}
