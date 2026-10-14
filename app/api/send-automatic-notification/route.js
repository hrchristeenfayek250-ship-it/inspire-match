
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const expectedSecret = process.env.NOTIFICATION_WEBHOOK_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 503 }
    );
  }

  const providedSecret = request.headers.get("x-webhook-secret");

  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: "Webhook authentication is ready. Automatic delivery is not enabled yet."
    },
    { status: 501 }
  );
}
