
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const db = createClient(
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
      await db.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const candidateId = String(
      (await request.json()).candidateId ?? ""
    );

    if (!/^[1-9]\d{0,18}$/.test(candidateId)) {
      return NextResponse.json(
        { error: "Invalid candidate ID." },
        { status: 400 }
      );
    }

    const { data: memberships, error: membershipError } =
      await db
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", authData.user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      return NextResponse.json(
        { error: "Company access denied." },
        { status: 403 }
      );
    }

    const { company_id: companyId, role } = memberships[0];

    const managerRoles = ["admin", "hr_manager", "senior_recruiter"];
    const ownerRoles = ["hr", "recruiter", "hr_specialist"];

    if (!managerRoles.includes(role) && !ownerRoles.includes(role)) {
      return NextResponse.json(
        { error: "Insufficient role permissions." },
        { status: 403 }
      );
    }

    const { data: candidate, error: candidateError } =
      await db
        .from("candidates")
        .select("id, user_id")
        .eq("id", candidateId)
        .eq("company_id", companyId)
        .not("deleted_at", "is", null)
        .maybeSingle();

    if (candidateError) throw candidateError;

    const canRestore =
      managerRoles.includes(role) ||
      (ownerRoles.includes(role) && candidate?.user_id === authData.user.id);

    if (!candidate || !canRestore) {
      return NextResponse.json(
        { error: "Candidate not found or access denied." },
        { status: 403 }
      );
    }

    const { data: restored, error: restoreError } =
      await db.rpc("restore_candidate", {
        p_candidate_id: candidateId,
      });

    if (restoreError) {
      console.error("Restore RPC failed:", restoreError);

      return NextResponse.json(
        { error: "Restoration was denied or failed." },
        { status: 403 }
      );
    }

    if (restored !== true) {
      throw new Error("Restoration was not confirmed.");
    }

    return NextResponse.json({
      success: true,
      message: "Candidate restored successfully.",
    });
  } catch (error) {
    console.error("Restore candidate error:", error);

    return NextResponse.json(
      { error: "Candidate restoration failed." },
      { status: 500 }
    );
  }
}
