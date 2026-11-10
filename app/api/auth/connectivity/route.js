// Public, read-only connectivity check for diagnosing sign-in network failures.
// No session, credentials, email address or API keys are accepted or returned.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return Response.json({ reachable: false }, { status: 200, headers });
  }

  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) {
      return Response.json({ reachable: false }, { status: 200, headers });
    }
    const response = await fetch(new URL("/auth/v1/health", url), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    // An HTTP response confirms network reachability, even if the health
    // endpoint requires authorization or reports a service-level error.
    return Response.json({ reachable: response.status < 500 }, { status: 200, headers });
  } catch {
    return Response.json({ reachable: false }, { status: 200, headers });
  }
}
