
import { createClient } from "@supabase/supabase-js";

import { createHash } from "node:crypto";

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
     
          "id, full_name, current_title, years_experience, skills, professional_summary, location, company_id, user_id, work_experience, education, certifications, projects, achievements"

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

   
    if (!candidate.company_id) {
      return Response.json(
        {
          error:
            "Candidate must belong to a company before intelligence can be saved.",
        },
        { status: 422 }
      );
    }

    const { data: existingResult, error: lookupError } =
      await supabase
        .from("candidate_intelligence_results")
        .select("*")
        .eq("company_id", companyId)
        .eq("candidate_id", candidate.id)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Candidate intelligence lookup failed:",
        lookupError.message
      );

      return Response.json(
        { error: "Could not check saved intelligence." },
        { status: 500 }
      );
    }

    if (existingResult && body?.regenerate !== true) {
      return Response.json({
        success: true,
        candidateId: candidate.id,
        intelligence: {
          professionalOverview:
            existingResult.professional_overview,
          verifiedStrengths:
            existingResult.verified_strengths,
          technicalSkills:
            existingResult.technical_skills,
          transferableSkills:
            existingResult.transferable_skills,
          experienceInsights:
            existingResult.experience_insights,
          informationGaps:
            existingResult.information_gaps,
          verificationQuestions:
            existingResult.verification_questions,
        },
        generatedAt: existingResult.generated_at,
        saved: true,
        cached: true,
      });
    }

   
   
    const profile = {
      fullName: candidate.full_name || null,
      currentTitle: candidate.current_title || null,
      yearsExperience: candidate.years_experience ?? null,
      location: candidate.location || null,
      skills: candidate.skills || null,
      professionalSummary:
        candidate.professional_summary || null,

      workExperience: Array.isArray(candidate.work_experience)
        ? candidate.work_experience
        : [],

      education: Array.isArray(candidate.education)
        ? candidate.education
        : [],

      certifications: Array.isArray(candidate.certifications)
        ? candidate.certifications
        : [],

      projects: Array.isArray(candidate.projects)
        ? candidate.projects
        : [],

      achievements: Array.isArray(candidate.achievements)
        
    const profileHash = createHash("sha256")
      .update(JSON.stringify(profile))
      .digest("hex");

        ? candidate.achievements
        : [],
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
- Use only information explicitly supported by the supplied profile.
- Never invent employment history, education, certifications,
  achievements, skills, or performance metrics.
- Treat all candidate-provided information as self-reported.
- The verifiedStrengths field means strengths supported by
  concrete examples in the supplied profile, not independently
  verified skills.
- If no concrete supporting evidence exists, return an empty
  verifiedStrengths array.
- List self-reported technical skills under technicalSkills.
- List self-reported transferable skills under transferableSkills,
  but never present personality traits as proven abilities.
- Do not interpret missing information as a weakness.
- Identify missing employment dates, achievements, tools,
  qualifications, or project details only when relevant.
- Ask practical, role-relevant verification questions.

- Analyze workExperience to identify documented career progression,
  responsibilities, domain exposure, and employment history.
- Use education and certifications to describe documented
  qualifications without assuming proficiency.
- Analyze projects to identify explicitly stated technologies,
  responsibilities, and outcomes.
- Use achievements only when supported by specific CV evidence.
- Distinguish documented experience from self-reported skills.
- Highlight career patterns without inventing performance claims.
- When dates or responsibilities are missing, identify the
  information gap rather than guessing.
- Keep the analysis professional, factual, and evidence-based.

- Do not infer protected personal characteristics.
- Do not assign hiring scores or suitability verdicts.
- Do not make hiring decisions.
- Return valid JSON only.`,

      content: [
        {
          type: "text",
          text: JSON.stringify(profile),
        },
      ],
      maxTokens: 2200,
    });

   


    const asArray = (value) =>
      Array.isArray(value)
        ? value.filter(
            (item) => typeof item === "string"
          )
        : [];

    const generatedAt = new Date().toISOString();

    const intelligenceRecord = {
      company_id: companyId,
      candidate_id: candidate.id,
      generated_by: authData.user.id,
      professional_overview:
        typeof intelligence.professionalOverview === "string"
          ? intelligence.professionalOverview
          : null,
      verified_strengths: asArray(
        intelligence.verifiedStrengths
      ),
      technical_skills: asArray(
        intelligence.technicalSkills
      ),
      transferable_skills: asArray(
        intelligence.transferableSkills
      ),
      experience_insights: asArray(
        intelligence.experienceInsights
      ),
      information_gaps: asArray(
        intelligence.informationGaps
      ),
      verification_questions: asArray(
        intelligence.verificationQuestions
      ),
      generated_at: generatedAt,
      updated_at: generatedAt,
    };

    const { data: savedResult, error: saveError } =
      await supabase
        .from("candidate_intelligence_results")
        .upsert(intelligenceRecord, {
          onConflict: "company_id,candidate_id",
        })
        .select("*")
        .single();

    if (saveError) {
      console.error(
        "Candidate intelligence save failed:",
        saveError.message
      );

      return Response.json(
        {
          error:
            "AI analysis completed, but saving the result failed.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      candidateId: candidate.id,
      intelligence: {
        professionalOverview:
          savedResult.professional_overview,
        verifiedStrengths:
          savedResult.verified_strengths,
        technicalSkills:
          savedResult.technical_skills,
        transferableSkills:
          savedResult.transferable_skills,
        experienceInsights:
          savedResult.experience_insights,
        informationGaps:
          savedResult.information_gaps,
        verificationQuestions:
          savedResult.verification_questions,
      },
      generatedAt: savedResult.generated_at,
      saved: true,
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
