
import { createClient } from "@supabase/supabase-js";
import { askClaude } from "@/lib/claude";

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

    const { data: authData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return Response.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const { data: memberships, error: memberError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", authData.user.id)
        .limit(2);

    if (memberError || memberships?.length !== 1) {
      return Response.json(
        { error: "Could not verify your company." },
        { status: 403 }
      );
    }

    
    const body = await request.json().catch(() => null);
    const candidateId = body?.candidateId;

    if (
      !(
        (typeof candidateId === "string" &&
          /^[1-9]\d*$/.test(candidateId)) ||
        (typeof candidateId === "number" &&
          Number.isSafeInteger(candidateId) &&
          candidateId > 0)
      )
    ) {
      return Response.json(
        { error: "Valid candidate ID required." },
        { status: 400 }
      );
    }

    const companyId = memberships[0].company_id;

    const { data: candidate, error: candidateError } =
      await supabase
        .from("candidates")
        .select(
          "id, full_name, current_title, years_experience, skills, professional_summary, location, company_id, user_id"
        )
        .eq("id", candidateId)
        .or(
          `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
        )
        .maybeSingle();

    if (candidateError) throw candidateError;

    if (!candidate) {
      return Response.json(
        { error: "Candidate not found or access denied." },
        { status: 404 }
      );
    }

    const profile = {
      currentTitle: candidate.current_title,
      yearsExperience: candidate.years_experience,
      skills: candidate.skills,
      professionalSummary: candidate.professional_summary,
    };

    if (
      !profile.currentTitle &&
      !profile.skills &&
      !profile.professionalSummary
    ) {
      return Response.json(
        { error: "Not enough profile data to analyze." },
        { status: 422 }
      );
    }

    const intelligence = await askClaude({
      system: `You are an evidence-based recruitment
intelligence assistant.

Analyze the supplied professional profile independently
of any specific job vacancy.

Return a JSON object with exactly these fields:
{
  "professionalOverview": "",
  "verifiedStrengths": [],
  "technicalSkills": [],
  "transferableSkills": [],
  "experienceInsights": [],
  "informationGaps": [],
  "verificationQuestions": []
}

Rules:
- Use only evidence in the supplied profile.
- Do not invent skills, qualifications, achievements
  or work experience.
- Treat the profile as self-reported information.
- Do not claim that skills have been independently verified.
- Distinguish missing information from skill deficiencies.
- Do not infer protected personal characteristics.
- Do not assign a hiring score or suitability verdict.
- Do not make a hiring decision.
- Return JSON only.`,
      content: [
        {
          type: "text",
          text: JSON.stringify(profile),
        },
      ],
      maxTokens: 2200,
    });

    return Response.json({
      success: true,
      candidateId: candidate.id,
      intelligence,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Candidate intelligence failed:",
      error.message
    );

    return Response.json(
      { error: "Could not generate candidate intelligence." },
      { status: 500 }
    );
  }
}
