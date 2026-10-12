
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

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

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const user = authData.user;
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (email === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot invite your own account." },
        { status: 400 }
      );
    }

    const { data: memberships, error: memberError } =
      await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .limit(2);

    if (
      memberError ||
      memberships?.length !== 1 ||
      memberships[0].role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Only company admins can send invitations." },
        { status: 403 }
      );
    }

    const companyId = memberships[0].company_id;

    const { data: existing, error: existingError } =
      await supabase
        .from("company_invitations")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

    if (existingError) throw existingError;

    if (existing?.length) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email." },
        { status: 409 }
      );
    }

    const oneHourAgo = new Date(
      Date.now() - 60 * 60 * 1000
    ).toISOString();

    const { count, error: countError } = await supabase
      .from("company_invitations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", oneHourAgo);

    if (countError) throw countError;

    if ((count || 0) >= 10) {
      return NextResponse.json(
        { error: "Invitation limit reached. Try again later." },
        { status: 429 }
      );
    }

    const { data: invitation, error: inviteError } =
      await supabase
        .from("company_invitations")
        .insert({
          company_id: companyId,
          email,
          role: "hr",
          created_by: user.id,
        })
        .select("token")
        .single();

    if (inviteError) throw inviteError;

    const inviteLink =
      "https://inspire-match-ats.vercel.app/app/accept-invite?token=" +
      encodeURIComponent(invitation.token);

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            "Inspire Match <invites@notify.hireandinspirebychristine.com>",
          to: [email],
          subject: "You're invited to join Inspire Match",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:30px">
              <h1 style="color:#173f3a">Welcome to Inspire Match</h1>
              <p>You have been invited to join an HR recruitment workspace.</p>
              <p>Click the button below to accept your invitation:</p>
              <p style="margin:30px 0">
                <a href="${inviteLink}"
                   style="background:#173f3a;color:white;padding:14px 22px;text-decoration:none;border-radius:8px">
                  Accept Invitation
                </a>
              </p>
              <p>This invitation is intended only for your email address.</p>
              <p>HIRE BETTER. INSPIRE MORE.</p>
            </div>
          `,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Invitation created, but email delivery failed.",
          inviteLink,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "HR invitation email sent successfully!",
      inviteLink,
    });
  } catch (error) {
    console.error("HR invitation error:", error.message);

    return NextResponse.json(
      { error: "Could not process the invitation." },
      { status: 500 }
    );
  }
}
