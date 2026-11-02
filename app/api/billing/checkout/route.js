// Inspire Match ATS | Sales-led private onboarding.
// Direct customer checkout is intentionally unavailable in every environment.
// Keep the route reserved for a future authorized server-side sales flow.
export const runtime = "nodejs";

export async function POST() {
 return Response.json(
  {error:"Self-service checkout is disabled. Contact Inspire Match Sales for activation."},
  {status:403,headers:{"Cache-Control":"no-store"}}
 );
}
