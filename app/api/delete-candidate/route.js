
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabase = createClient(
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
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const { candidateId } = await request.json();

    if (!candidateId || !/^\d+$/.test(String(candidateId))) {
      return NextResponse.json(
        { error: "Invalid candidate ID." },
        { status: 400 }
      );
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", authData.user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      return NextResponse.json(
        { error: "Company access denied." },
        { status: 403 }
      );
    }

    const companyId = memberships[0].company_id;

    const { data: candidate, error: lookupError } =
      await supabase
        .from("candidates")
        .select("id")
        .eq("id", candidateId)
        .eq("company_id", companyId)
        .maybeSingle();

    if (lookupError) throw lookupError;

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidate.id)
      .eq("company_id", companyId)
      .select("id");

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Candidate deleted successfully.",
    });
  } catch (error) {
    console.error("Delete candidate error:", error);
    return NextResponse.json(
      { error: "Could not delete candidate." },
      { status: 500 }
    );
  }
}
