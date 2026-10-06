import { askClaude } from "@/lib/claude";
import { fileToBlocks } from "@/lib/files";
import { cvSystem } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const form = await req.formData();

    const cv = form.get("cv");
    const jd = JSON.parse(form.get("jd") || "null");
    const blind = form.get("blind") === "true";

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
      maxTokens: 4000,
    });

    if (blind && result.candidate) {
      result.candidate.name = null;
    }

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err.message || "CV scoring failed." },
      { status: 500 }
    );
  }
}
