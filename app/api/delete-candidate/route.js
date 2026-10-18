
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
        .select("id, user_id, cv_file_url")
        .eq("id", candidateId)
        .eq("company_id", companyId)
        .maybeSingle();

    if (candidateError) throw candidateError;

    if (
      !candidate ||
      (role !== "admin" && candidate.user_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Candidate not found or access denied." },
        { status: 403 }
      );
    }

    const cvPath = candidate.cv_file_url;

    const { data: deleted, error: deleteError } =
      await db.rpc("delete_candidate_secure", {
        p_candidate_id: candidateId,
      });

    if (deleteError) throw deleteError;

    if (deleted !== true) {
      throw new Error("Candidate deletion was not confirmed.");
    }

    let warning = null;

    if (cvPath) {
      const safePath =
        typeof cvPath === "string" &&
        cvPath.startsWith(`${companyId}/`) &&
        !cvPath.split("/").includes("..");

      if (!safePath) {
        warning = "CV file requires manual cleanup.";
      } else if (!process.env.SUPABASE_SECRET_KEY) {
        warning = "CV cleanup is not configured.";
      } else {
        try {
          const storage = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SECRET_KEY,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
            }
          );

          const { error: storageError } = await storage.storage
            .from("candidate-cvs")
            .remove([cvPath]);

          if (storageError) throw storageError;
        } catch (storageError) {
          console.error("CV cleanup failed:", storageError);
          warning = "Candidate deleted, but CV cleanup failed.";
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Candidate deleted successfully.",
      warning,
    });
  } catch (error) {
    console.error("Delete candidate error:", error);

    return NextResponse.json(
      { error: "Candidate deletion failed. No successful deletion was confirmed." },
      { status: 500 }
    );
  }
}
