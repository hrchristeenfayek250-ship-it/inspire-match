
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FROM_EMAIL =
  "Inspire Match <invites@notify.hireandinspirebychristine.com>";

function respond(message, status = 200) {
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


function createServerSupabase() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Supabase server key is not configured.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}



export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return respond("Please sign in first.", 401);
    }

    const token = authorization.slice(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return respond("Invalid session.", 401);
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = body.notificationId;

    if (
      typeof notificationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        notificationId
      )
    ) {
      return respond("Invalid notification ID.", 400);
    }

    const { data: notification, error: notificationError } =
      await supabase
        .from("notifications")
        .select(
          "id, company_id, recipient_id, title, message, type, email_status"
        )
        .eq("id", notificationId)
        .eq("recipient_id", user.id)
        .single();

    if (notificationError || !notification) {
      return respond("Notification not found.", 404);
    }

    if (notification.email_status !== "pending") {
      return respond("Notification is not pending.", 409);
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("company_id", notification.company_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError || !membership) {
      return respond("Access denied.", 403);
    }

    const { data: preferences, error: preferencesError } =
      await supabase
        .from("notification_preferences")
        .select("*")
        .eq("company_id", notification.company_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (preferencesError) {
      return respond("Could not load email preferences.", 500);
    }

    if (preferences?.email_enabled === false) {
      return respond("Email notifications are disabled.", 403);
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

    if (
      categoryField &&
      preferences?.[categoryField] === false
    ) {
      return respond("This email category is disabled.", 403);
    }

    if (!process.env.RESEND_API_KEY) {
      return respond("Email service is not configured.", 503);
    }

    const serverSupabase = createServerSupabase();

    const { data: claimed, error: claimError } =
      await serverSupabase.rpc("claim_notification_email", {
        p_notification_id: notificationId,
      });

    if (claimError) {
      console.error("Email claim failed:", claimError.message);
      return respond("Could not reserve notification email.", 500);
    }

    if (claimed !== true) {
      return respond("Email already claimed or unavailable.", 409);
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
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [user.email],
          subject: notification.title,
          html: `
            <div style="font-family:Arial,sans-serif;
                        max-width:580px;margin:auto;
                        padding:32px;color:#1e3b32">
              <h2 style="margin-bottom:8px">
                Inspire Match
              </h2>
              <p style="color:#777">
                Recruitment Notification
              </p>
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
    } catch (sendError) {
      console.error(
        "Resend connection failed; delivery status is unknown:",
        sendError.message
      );

      return respond(
        "Email delivery status is unknown. The notification is held to prevent duplicate sending.",
        502
      );
    }


    
    if (!emailResponse.ok) {
      console.error(
        "Resend delivery request failed:",
        emailResponse.status
      );
    }

    const { data: completed, error: completeError } =
      await serverSupabase.rpc("complete_notification_email", {
        p_notification_id: notificationId,
        p_success: emailResponse.ok,
      });

    if (completeError || completed !== true) {
      console.error(
        "Could not finalize notification email:",
        completeError?.message || "Status not updated"
      );
      return respond("Could not finalize email status.", 500);
    }

    if (!emailResponse.ok) {
      return respond("Email delivery request failed.", 502);
    }

    return respond(
      "Email accepted by Resend and status saved. Delivery is not yet confirmed."
    );

  } catch (error) {
    console.error("Notification email error:", error.message);
    return respond("Could not send notification email.", 500);
  }
}
