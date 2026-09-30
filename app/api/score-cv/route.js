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
      return Response.json({ error: "Read the job description before scoring CVs." }, { status: 400 });
    }

    const criteriaText = jd.criteria
      .map((c) => `- ${c.id} | ${c.name} (${c.importance === "must" ? "must-have" : "nice-to-have"}): ${c.detail}`)
      .join("\n");

    const content = [
      {
        type: "text",
        text: `Role: ${jd.title} (${jd.seniority || "level not stated"})\nRole summary: ${jd.summary}\n\nCriteria:\n${criteriaText}\n\nThe candidate's CV follows.`,
      },
      ...(await fileToBlocks(cv)),
    ];

    const result = await askClaude({ system: cvSystem(blind), content, maxTokens: 3000 });
    if (blind && result.candidate) result.candidate.name = null;
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
