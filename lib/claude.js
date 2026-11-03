const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 22000;

// Keep the complete AI request below the Vercel function timeout.
// Model discovery on every request caused unnecessary network calls and
// could exhaust the serverless execution window before JD analysis began.
export async function askClaude({ system, content, maxTokens = 4000 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing.");

  const configured = (process.env.GEMINI_MODEL || "").trim().replace(/^models\//, "");
  if (configured && !/^[a-zA-Z0-9._-]+$/.test(configured)) {
    throw new Error("Invalid GEMINI_MODEL configuration.");
  }

  const preferred = configured || "gemini-2.5-flash";
  const models = [...new Set([
    preferred,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ])];

  const parts = (content || []).flatMap((block) => {
    if (block?.type === "text" && typeof block.text === "string") {
      return [{ text: block.text }];
    }
    if (block?.type === "document" && block.source?.type === "base64") {
      return [{
        inlineData: {
          mimeType: block.source.media_type,
          data: block.source.data,
        },
      }];
    }
    return [];
  });

  if (!parts.length) throw new Error("No usable content was provided to Gemini.");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });

  let lastError;
  for (const model of models) {
    try {
      const response = await fetch(
        `${API_BASE}/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "content-type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
      );

      if (!response.ok) {
        // Do not log the provider's response body; it may contain sensitive content.
        const error = new Error(`Gemini API error ${response.status} (${model})`);
        error.status = response.status;
        if ([400, 401, 403].includes(response.status)) throw error;
        lastError = error;
        if ([404, 429, 500, 502, 503, 504].includes(response.status)) continue;
        throw error;
      }

      const data = await response.json();
      const output = (data.candidates?.[0]?.content?.parts || [])
        .filter((part) => typeof part.text === "string")
        .map((part) => part.text)
        .join("\n")
        .trim();

      if (!output) {
        throw new Error("Gemini returned no usable response.");
      }
      return parseJSON(output);
    } catch (error) {
      lastError = error;
      const retryable = error?.name === "TimeoutError" ||
        error?.name === "AbortError" ||
        error instanceof TypeError ||
        [404, 429, 500, 502, 503, 504].includes(error?.status);
      if (!retryable) throw error;
      console.warn(`Gemini request unavailable for ${model}:`, error?.message);
    }
  }
  throw lastError || new Error("Gemini service is temporarily unavailable.");
}

function parseJSON(text) {
  const clean = text.replace(/\`\`\`json/gi, "").replace(/\`\`\`/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("The AI response was not valid JSON.");
  }
  return JSON.parse(clean.slice(start, end + 1));
}
