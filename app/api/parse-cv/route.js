
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
        .limit(2);

    if (memberError || membership?.length !== 1) {
      return Response.json(
        { error: "Exactly one company workspace is required." },
        { status: 403 }
      );
    }

    const access = await supabase.rpc("billing_my_tenant_entry_gate");
    if (access.error || access.data?.allowed !== true) {
      return Response.json({ error: "Workspace access not approved." }, { status: 403 });
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
     
      system: `Extract a structured professional candidate profile from the uploaded CV.

Return ONLY a valid JSON object with this exact structure:
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
  "workExperience": [],
  "certifications": [],
  "projects": [],
  "achievements": [],
  "summary": null
}

FIELD REQUIREMENTS:

education:
Array of objects:
{
  "degree": null,
  "fieldOfStudy": null,
  "institution": null,
  "startDate": null,
  "endDate": null
}

workExperience:
Array of objects:
{
  "jobTitle": null,
  "company": null,
  "startDate": null,
  "endDate": null,
  "isCurrent": false,
  "responsibilities": [],
  "achievements": []
}

certifications:
Array of objects:
{
  "name": null,
  "issuer": null,
  "date": null,
  "credentialId": null
}

projects:
Array of objects:
{
  "name": null,
  "role": null,
  "description": null,
  "technologies": [],
  "outcomes": []
}

achievements:
Array of strings describing explicitly documented
professional achievements.

EXTRACTION RULES:
- Extract only information explicitly supported by the CV.
- Never invent employers, dates, qualifications, skills,
  achievements, metrics, or project outcomes.
- Use null for missing scalar values.
- Use empty arrays for missing collections.
- Keep yearsExperience numeric or null.
- Preserve original company and institution names.
- Do not infer that a role is current unless supported.
- Distinguish job responsibilities from achievements.
- Do not extract protected personal characteristics.
- Return valid JSON only, without markdown fences.`,

      content: await fileToBlocks(cv),
      maxTokens: 2000,
    });

    return Response.json({
      success: true,
      candidate,
      fileName: cv.name,
    });
  } catch (error) {
    const message = String(error?.message || "");
    const providerStatus = Number(error?.status) || 0;
    const tooLarge = /larger than 4 MB/i.test(message);
    const invalidFile = /not supported|no readable text|No file received/i.test(message);
    const code = tooLarge ? "CV_FILE_TOO_LARGE"
      : invalidFile ? "CV_FILE_UNREADABLE"
      : providerStatus === 429 ? "AI_QUOTA_REACHED"
      : providerStatus === 404 ? "AI_MODEL_UNAVAILABLE"
      : /TimeoutError|AbortError|timeout/i.test(message) ? "AI_TIMEOUT"
      : "CV_PARSING_FAILED";

    console.error("CV parsing failed:", { code, providerStatus: providerStatus || null });
    const messages = {
      CV_FILE_TOO_LARGE: "The CV is larger than 4 MB. Compress it and try again.",
      CV_FILE_UNREADABLE: "This CV could not be read. Upload a readable PDF, DOCX or TXT file.",
      AI_QUOTA_REACHED: "AI usage limit reached. Please try again later.",
      AI_MODEL_UNAVAILABLE: "The configured AI model is unavailable. Contact the administrator.",
      AI_TIMEOUT: "CV parsing timed out. Try again with a smaller file.",
      CV_PARSING_FAILED: "Could not parse this CV. Please try again.",
    };
    return Response.json(
      { error: messages[code], code },
      { status: tooLarge ? 413 : invalidFile ? 422 : providerStatus === 429 ? 503 : 500,
        headers: { "Cache-Control": "no-store" } }
    );
  }
}
