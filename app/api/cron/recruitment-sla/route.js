import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function equalSecret(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization") || "";
  if (!secret || !equalSecret(bearer, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: "Supabase server credentials not configured" }, { status: 503 });
  }
  try {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await client.rpc("generate_recruitment_sla_alerts");
    if (error) {
      console.error("SLA generation failed:", error.message);
      return NextResponse.json({ error: "SLA generation failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error("SLA cron error:", error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
