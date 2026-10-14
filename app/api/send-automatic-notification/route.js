
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FROM_EMAIL =
  "Inspire Match <invites@notify.hireandinspirebychristine.com>";

function reply(message, status = 200) {
  return NextResponse.json(
    { success: status === 200, message },
    { status }
  );
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

function validSecret(provided, expected) {
  if (!provided || !expected) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  const expectedSecret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-webhook-secret");

  if (!expectedSecret) {
    return reply("Webhook is not configured.", 503);
  }

  if (!validSecret(providedSecret, expectedSecret)) {
    return reply("Unauthorized.", 401);
  }

  if (
    !process.env.SUPABASE_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.RESEND_API_KEY
  ) {
    return reply("Email service is not fully configured.", 503);
  }

  try {
    const body = await request.json().catch(() => ({}));

    const notificationId =
      body.notificationId || body.record?.id;

    if (
      typeof notificationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        notificationId
      )
    ) {
      return reply("Invalid notification ID.", 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: notification, error: notificationError } =
      await supabase
        .from("notifications")
        .select(
          "id, company_id, recipient_id, title, message, type, email_status"
        )
        .eq("id", notificationId)
        .maybeSingle();

    if (notificationError || !notification) {
      return reply("Notification not found.", 404);
    }

    if (notification.email_status !== "pending") {
      return reply("Notification is not pending.", 409);
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("company_id", notification.company_id)
        .eq("user_id", notification.recipient_id)
        .maybeSingle();

    if (membershipError || !membership) {
      return reply("Recipient is not an active company member.", 403);
    }

    const { data: preferences, error: preferencesError } =
      await supabase
        .from("notification_preferences")
        .select("*")
        .eq("company_id", notification.company_id)
        .eq("user_id", notification.recipient_id)
        .maybeSingle();

    if (preferencesError) {
      return reply("Could not load notification preferences.", 500);
    }

    if (preferences?.email_enabled === false) {
      return reply("Email notifications are disabled.", 403);
    }

    const type = String(notification.type || "").toLowerCase();

    const categoryField = {
      ai_matching: "ai_matching_enabled",
      candidate: "candidates_enabled",
      candidates: "candidates_enabled",
      job: "jobs_enabled",
      jobs: "jobs_enabled",
      interview: "interviews_enabled",
      interviews: "interviews_enabled",
      team: "team_enabled",
    }[type];

    if (categoryField && preferences?.[categoryField] === false) {
      return reply("This email category is disabled.", 403);
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(
        notification.recipient_id
      );

    const recipientEmail = userData?.user?.email;

    if (userError || !recipientEmail) {
      return reply("Recipient email was not found.", 404);
    }

    const { data: claimed, error: claimError } =
      await supabase.rpc("claim_notification_email", {
        p_notification_id: notificationId,
      });

    if (claimError || claimed !== true) {
      console.error("Claim error:", claimError?.message);
      return reply("Notification could not be claimed.", 409);
    }

    let emailResponse;

    try {
      emailResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `inspire-notification-${notificationId}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: notification.title,
            html: `
              <div style="font-family:Arial,sans-serif;
                          max-width:580px;margin:auto;
                          padding:32px;color:#1e3b32">
                <h2>Inspire Match</h2>
                <p style="color:#777">Recruitment Notification</p>
                <div style="padding:24px;
                            border:1px solid #e1e8e2;
                            border-radius:12px;
                            background:#f7faf7">
                  <h3>${escapeHtml(notification.title)}</h3>
                  <p style="white-space:pre-wrap">
                    ${escapeHtml(notification.message)}
                  </p>
                </div>
                <p style="margin-top:24px">
                  <a href="https://inspire-match-ats.vercel.app/app/dashboard"
                     style="color:#245c4a;font-weight:bold">
                    Open Inspire Match
                  </a>
                </p>
                <p style="font-size:12px;color:#888">
                  HIRE BETTER. INSPIRE MORE.
                </p>
              </div>
            `,
          }),
        }
      );
    } catch (error) {
      console.error("Email delivery status unknown:", error.message);
      return reply(
        "Email delivery status is unknown; notification held to avoid duplicates.",
        502
      );
    }

    const { data: completed, error: completeError } =
      await supabase.rpc("complete_notification_email", {
        p_notification_id: notificationId,
        p_success: emailResponse.ok,
      });

    if (completeError || completed !== true) {
      console.error("Completion error:", completeError?.message);
      return reply("Could not update email status.", 500);
    }

    if (!emailResponse.ok) {
      console.error("Resend rejected email:", emailResponse.status);
      return reply("Email request was rejected.", 502);
    }

    return reply(
      "Email accepted by Resend and notification status updated."
    );
  } catch (error) {
    console.error("Automatic notification error:", error.message);
    return reply("Automatic notification failed.", 500);
  }
}

