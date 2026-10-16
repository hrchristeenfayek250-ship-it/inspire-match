
import { createClient } from "@supabase/supabase-js";
import { askClaude } from "@/lib/claude";
import { fileToBlocks } from "@/lib/files";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return Response.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

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

    const { data, error } =
      await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return Response.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const { data: membership, error: memberError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", data.user.id)
        .limit(1);

    if (memberError || !membership?.length) {
      return Response.json(
        { error: "Company membership required." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const cv = form.get("cv");

    if (!(cv instanceof File)) {
      return Response.json(
        { error: "Please upload a CV." },
        { status: 400 }
      );
    }

    const candidate = await askClaude({
      system: `Extract a professional candidate profile from the CV.

Return JSON only:
{
  "name": null,
  "email": null,
  "phone": null,
  "currentTitle": null,
  "yearsExperience": null,
  "location": null,
  "linkedinUrl": null,
  "skills": [],
  "education": [],
  "summary": null
}

Extract only information supported by the CV.
Never invent missing information.
Keep yearsExperience numeric or null.
Do not extract protected personal characteristics.`,
      content: await fileToBlocks(cv),
      maxTokens: 2000,
    });

    return Response.json({
      success: true,
      candidate,
      fileName: cv.name,
    });
  } catch (error) {
    console.error("CV parsing failed:", error.message);

    return Response.json(
      { error: "Could not parse this CV." },
      { status: 500 }
    );
  }
}
