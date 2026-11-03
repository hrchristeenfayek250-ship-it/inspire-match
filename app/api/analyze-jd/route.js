import { requireApprovedTenant } from "@/lib/server-tenant-gate";
import { askClaude } from "@/lib/claude";
import { fileToBlocks } from "@/lib/files";
import { JD_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    if (!(await requireApprovedTenant(req))) {
      return Response.json(
        { error: "Your company workspace is not approved for ATS access." },
        { status: 403 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    const text = (form.get("text") || "").toString().trim();

    let content;
    if (file && typeof file !== "string" && file.size > 0) {
      content = [...(await fileToBlocks(file)), { type: "text", text: "Analyse this job description." }];
    } else if (text.length > 50) {
      content = [{ type: "text", text: `Analyse this job description:\n\n${text}` }];
    } else {
      return Response.json({ error: "Upload a job description or paste at least a few lines of it." }, { status: 400 });
    }

    const jd = await askClaude({ system: JD_SYSTEM, content, maxTokens: 2500 });
    jd.criteria = normaliseWeights(jd.criteria || []);
    return Response.json(jd);
 
  } catch (err) {
    const message = String(err?.message || "");
    const status = Number(err?.status) || 0;
    const code = !process.env.GEMINI_API_KEY || message.includes("GEMINI_API_KEY")
      ? "AI_CONFIGURATION_MISSING"
      : [401, 403].includes(status)
        ? "AI_CREDENTIALS_REJECTED"
        : status === 429
          ? "AI_QUOTA_EXCEEDED"
          : status === 404
            ? "AI_MODEL_UNAVAILABLE"
            : /TimeoutError|AbortError|timeout/i.test(message)
              ? "AI_TIMEOUT"
              : /JSON|no usable response/i.test(message)
                ? "AI_INVALID_RESPONSE"
                : [500, 502, 503, 504].includes(status)
                  ? "AI_PROVIDER_UNAVAILABLE"
                  : "JD_ANALYSIS_FAILED";
    console.error("JD analysis failed:", { code, providerStatus: status || null, message });
    const messages = {
      AI_CONFIGURATION_MISSING: "AI service configuration is missing. Contact the administrator.",
      AI_CREDENTIALS_REJECTED: "AI provider credentials were rejected. Contact the administrator.",
      AI_QUOTA_EXCEEDED: "AI provider quota has been reached. Please try again later.",
      AI_MODEL_UNAVAILABLE: "The configured AI model is unavailable. Contact the administrator.",
      AI_TIMEOUT: "The AI provider timed out. Please try again.",
      AI_INVALID_RESPONSE: "The AI provider returned an invalid analysis. Please try again.",
      AI_PROVIDER_UNAVAILABLE: "The AI provider is temporarily unavailable. Please try again.",
      JD_ANALYSIS_FAILED: "JD analysis failed. Please contact support with the error code.",
    };
    return Response.json(
      { error: messages[code], code },
      { status: [429, 500, 502, 503, 504].includes(status) ? 503 : 500, headers: { "Cache-Control": "no-store" } }
    );
  }

}

// Guarantees ids exist and weights add up to 100.
function normaliseWeights(criteria) {
  const list = criteria.map((c, i) => ({ ...c, id: c.id || `c${i + 1}`, weight: Math.max(1, Number(c.weight) || 10) }));
  const total = list.reduce((s, c) => s + c.weight, 0);
  let running = 0;
  return list.map((c, i) => {
    const w = i === list.length - 1 ? 100 - running : Math.round((c.weight / total) * 100);
    running += w;
    return { ...c, weight: w };
  });
}
