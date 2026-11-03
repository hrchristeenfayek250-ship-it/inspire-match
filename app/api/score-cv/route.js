import { requireApprovedTenant } from "@/lib/server-tenant-gate";
import { askClaude } from "@/lib/claude";
import { fileToBlocks } from "@/lib/files";
import { cvSystem } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    if (!(await requireApprovedTenant(req))) {
      return Response.json({ error: "Workspace approval is required to use AI tools." }, { status: 403 });
    }

    const form = await req.formData();

    const cv = form.get("cv");
    const jd = JSON.parse(form.get("jd") || "null");
    const blind = false;

    if (!jd?.criteria?.length) {
      return Response.json(
        { error: "Read the job description before scoring CVs." },
        { status: 400 }
      );
    }

    if (!cv) {
      return Response.json(
        { error: "CV file is required." },
        { status: 400 }
      );
    }

    const criteriaText = jd.criteria
      .map(
        (c) =>
          `- ${c.id} | ${c.name} (${
            c.importance === "must" ? "must-have" : "nice-to-have"
          }): ${c.detail}`
      )
      .join("\n");

    const content = [
      {
        type: "text",
        text: `Role: ${jd.title} (${jd.seniority || "level not stated"})

Role summary:
${jd.summary}

Criteria:
${criteriaText}

The candidate's CV follows.`,
      },
      ...(await fileToBlocks(cv)),
    ];

    const systemPrompt = `${cvSystem(blind)}

In addition to the screening result, extract the candidate's professional profile from the CV.

Return the candidate object with these fields:
{
  "name": "full name or null",
  "email": "email address or null",
  "phone": "phone number or null",
  "currentTitle": "current or most recent job title or null",
  "yearsExperience": number or null,
  "location": "city/country or null",
  "linkedinUrl": "LinkedIn URL or null",
  "skills": ["key professional skills"],
  "education": ["degrees, universities or relevant education"],
  "summary": "short professional summary based only on the CV"
}

Extraction rules:
- Extract information only when it appears in the CV.
- Never invent missing information.
- Keep yearsExperience numeric when it can be reasonably determined from the CV.
- Skills should contain relevant professional/technical skills only.
- Education should contain the actual education information found in the CV.
- linkedinUrl must be null if no LinkedIn URL is found.
- email and phone must be null if they are not present.
- Do not use any protected characteristic in scoring or recommendation.
- Return JSON only.`;

    const result = await askClaude({
      system: systemPrompt,
      content,
      maxTokens: 8192,
    });

    if (blind && result.candidate) {
      result.candidate.name = null;
    }

    return Response.json(result);
  
  } catch (err) {
    const message = String(err?.message || "");
    const providerStatus = Number(err?.status) || 0;
    const code = /larger than 4 MB/i.test(message)
      ? "CV_FILE_TOO_LARGE"
      : /not supported|no readable text|No file received/i.test(message)
        ? "CV_FILE_UNREADABLE"
        : err?.code === "AI_OUTPUT_TRUNCATED"
          ? "AI_OUTPUT_TRUNCATED"
          : !process.env.GEMINI_API_KEY || /GEMINI_API_KEY/.test(message)
            ? "AI_NOT_CONFIGURED"
            : [401, 403].includes(providerStatus)
              ? "AI_CREDENTIALS_REJECTED"
              : providerStatus === 429
                ? "AI_QUOTA_REACHED"
                : providerStatus === 404
                  ? "AI_MODEL_UNAVAILABLE"
                  : providerStatus === 400
                    ? "AI_FILE_REJECTED"
                    : /TimeoutError|AbortError|timed out/i.test(message)
                      ? "AI_TIMEOUT"
                      : /JSON|no usable response/i.test(message)
                        ? "AI_INVALID_OUTPUT"
                        : [500, 502, 503, 504].includes(providerStatus)
                          ? "AI_PROVIDER_UNAVAILABLE"
                          : "CV_SCORING_FAILED";
    const messages = {
      CV_FILE_TOO_LARGE: "The CV is larger than 4 MB. Compress the PDF and try again.",
      CV_FILE_UNREADABLE: "This CV could not be read. Upload a readable PDF, DOCX or TXT file.",
      AI_OUTPUT_TRUNCATED: "The AI output was cut off. Please try again.",
      AI_NOT_CONFIGURED: "AI service is not configured. Contact your administrator.",
      AI_CREDENTIALS_REJECTED: "AI service credentials were rejected. Contact your administrator.",
      AI_QUOTA_REACHED: "AI usage limit has been reached. Try again later.",
      AI_MODEL_UNAVAILABLE: "The selected AI model is unavailable. Contact your administrator.",
      AI_FILE_REJECTED: "The AI provider could not process this CV. Try a text-based PDF or DOCX.",
      AI_TIMEOUT: "CV analysis timed out. Try again with a smaller CV.",
      AI_INVALID_OUTPUT: "The AI response was incomplete or invalid. Please try again.",
      AI_PROVIDER_UNAVAILABLE: "AI provider is temporarily unavailable. Please try again.",
      CV_SCORING_FAILED: "CV scoring failed. Contact support with the error code.",
    };
    // No candidate names or CV text in logs or client errors.
    console.error("CV scoring failed:", { code, providerStatus: providerStatus || null });
    return Response.json(
      { error: messages[code], code },
      { status: code === "CV_FILE_TOO_LARGE" ? 413 : code === "CV_FILE_UNREADABLE" ? 422 : 500,
        headers: { "Cache-Control": "no-store" } }
    );
  }

}
