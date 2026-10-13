
import { createClient } from "@supabase/supabase-js";
import { askClaude } from "@/lib/claude";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json(
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
      return Response.json(
        { error: "Invalid session." },
        { status: 401 }
      );
    }

    const user = authData.user;
    const body = await request.json();
    const jobId = body?.jobId;
    const candidateId = body?.candidateId;

    if (!jobId || !candidateId) {
      return Response.json(
        { error: "Job and candidate are required." },
        { status: 400 }
      );
    }

    const { data: memberships, error: membershipError } =
      await db
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      return Response.json(
        { error: "Company access could not be verified." },
        { status: 403 }
      );
    }

    const companyId = memberships[0].company_id;

    const companyFilter =
      `company_id.eq.${companyId},` +
      `and(company_id.is.null,user_id.eq.${user.id})`;

    const { data: job, error: jobError } =
      await db
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .or(companyFilter)
        .maybeSingle();

    if (jobError) throw jobError;

    const { data: candidate, error: candidateError } =
      await db
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .or(companyFilter)
        .maybeSingle();

    if (candidateError) throw candidateError;

    if (
      !job ||
      !candidate ||
      String(candidate.job_id) !== String(job.id)
    ) {
      return Response.json(
        { error: "Job or assigned candidate not available." },
        { status: 404 }
      );
    }

    const jobDetails = {
      title: job.title,
      description: job.description,
      requiredSkills: job.required_skills,
      requirements: job.requirements,
      preferredRequirements: job.nice_to_have_requirements,
      experienceRequired: job.years_of_experience,
      responsibilities: job.responsibilities,
    };

    // Use job-independent candidate information only.
    // Do not reuse an old AI matching score.
    const candidateEvidence = {
      currentTitle: candidate.current_title,
      yearsExperience: candidate.years_experience,
      skills: candidate.skills || null,
      professionalSummary:
        candidate.professional_summary ||
        candidate.profile_summary ||
        candidate.summary ||
        null,
      cvText:
        candidate.cv_text ||
        candidate.resume_text ||
        null,
    };

    const usableEvidence = Object.values(candidateEvidence)
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value))
      .join(" ")
      .trim();

    if (!usableEvidence) {
      return Response.json(
        {
          error:
            "Candidate profile needs more professional information before matching.",
        },
        { status: 422 }
      );
    }

    if (
      !job.description &&
      !job.requirements &&
      !job.required_skills
    ) {
      return Response.json(
        {
          error:
            "Add job requirements before running AI matching.",
        },
        { status: 422 }
      );
    }

    const system = `
You are an evidence-based recruitment matching analyst.

Evaluate the candidate against this specific job only.

Rules:
- Use only the supplied professional evidence.
- Never invent missing qualifications or experience.
- Do not reuse any previous screening score.
- Ignore names, age, gender, nationality, religion,
  marital status, disability and other protected traits.
- Do not infer protected characteristics.
- Missing information is not proof of missing ability.
- If evidence is insufficient, return a null score.
- Give short, factual explanations.
- A score is decision support, not a hiring decision.

Return JSON only:
{
  "score": 0,
  "confidence": "high",
  "verdict": "Strong Match",
  "summary": "Brief evidence-based explanation",
  "strengths": ["Supported professional strengths"],
  "gaps": ["Requirements not evidenced"],
  "interviewQuestions": ["Questions to verify uncertain fit"]
}

Score must be between 0 and 100, or null.
Confidence must be "high", "medium" or "low".
If evidence is insufficient, set score to null,
confidence to "low", and explain why.
`;

    const result = await askClaude({
      system,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            job: jobDetails,
            candidate: candidateEvidence,
          }),
        },
      ],
      maxTokens: 1500,
    });

    const numericScore = Number(result?.score);

    const score =
      result?.score === null ||
      result?.score === undefined ||
      result?.score === "" ||
      !Number.isFinite(numericScore)
        ? null
        : Math.max(
            0,
            Math.min(100, Math.round(numericScore))
          );

    const toList = (value) =>
      Array.isArray(value)
        ? value.slice(0, 5).map((item) =>
            String(item).slice(0, 300)
          )
        : [];

    return Response.json({
      jobId: job.id,
      candidateId: candidate.id,
      score,
      confidence: ["high", "medium", "low"].includes(
        result?.confidence
      )
        ? result.confidence
        : "low",
      verdict: String(
        result?.verdict || "Review Required"
      ),
      summary: String(result?.summary || ""),
      strengths: toList(result?.strengths),
      gaps: toList(result?.gaps),
      interviewQuestions: toList(
        result?.interviewQuestions
      ),
      evaluatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI matching failed:", error);

    return Response.json(
      {
        error: "AI matching failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
