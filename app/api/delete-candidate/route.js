
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function DELETE(request) {
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
          headers: { Authorization: `Bearer ${token}` },
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

    const user = authData.user;

    const { data: memberships, error: membershipError } =
      await db
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      return NextResponse.json(
        { error: "Company access denied." },
        { status: 403 }
      );
    }

    const { company_id: companyId, role } = memberships[0];

    const { data: candidate, error: candidateError } =
      await db
        .from("candidates")
        .select("id, user_id")
        .eq("id", candidateId)
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .maybeSingle();

    if (candidateError) throw candidateError;

    const managerRoles = [
      "admin",
      "hr_manager",
      "senior_recruiter",
    ];

    const ownerRoles = [
      "hr",
      "recruiter",
      "hr_specialist",
    ];

    const canDelete =
      managerRoles.includes(role) ||
      (
        ownerRoles.includes(role) &&
        candidate?.user_id === user.id
      );

    if (!candidate || !canDelete) {
      return NextResponse.json(
        { error: "Candidate not found or access denied." },
        { status: 403 }
      );
    }

    const { data: deleted, error: deleteError } =
      await db.rpc("soft_delete_candidate", {
        p_candidate_id: candidateId,
      });

    if (deleteError) {
      console.error("Soft delete RPC failed:", deleteError);

      return NextResponse.json(
        { error: "Candidate deletion was denied or failed." },
        { status: 403 }
      );
    }

    if (deleted !== true) {
      throw new Error("Candidate deletion was not confirmed.");
    }

    return NextResponse.json({
      success: true,
      message: "Candidate moved to Recycle Bin successfully.",
    });
  } catch (error) {
    console.error("Delete candidate error:", error);

    return NextResponse.json(
      { error: "Candidate deletion failed." },
      { status: 500 }
    );
  }
}


