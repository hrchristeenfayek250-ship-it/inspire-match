
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
    console.error("CV parsing failed:", error.message);

    return Response.json(
      { error: "Could not parse this CV." },
      { status: 500 }
    );
  }
}
