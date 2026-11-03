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

  // Gemini 2.5 access may be restricted for new projects; 2.0 has shut down.
  // Prefer currently supported stable Flash models, even when Vercel still
  // has an old GEMINI_MODEL configured. Preserve legacy as a last fallback.
  const stableModels = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
  ];
  const oldModel = /^gemini-(2\.0|2\.5)-/.test(configured);
  const models = [...new Set([
    ...(!oldModel && configured ? [configured] : []),
    ...stableModels,
    ...(oldModel ? [configured] : []),
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
  let meaningfulError;
  const deadline = Date.now() + 49000;
  for (const model of models) {
    if (Date.now() >= deadline - 3000) break;
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
          signal: AbortSignal.timeout(Math.max(1000, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now() - 1000))),
        }
      );

      if (!response.ok) {
        // Do not log the provider's response body; it may contain sensitive content.
        const error = new Error(`Gemini API error ${response.status} (${model})`);
        error.status = response.status;
        if ([400, 401, 403].includes(response.status)) throw error;
        lastError = error;
        if (response.status !== 404) meaningfulError = error;
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
      if (error?.status !== 404) meaningfulError = error;
      const retryable = error?.name === "TimeoutError" ||
        error?.name === "AbortError" ||
        error instanceof TypeError ||
        [404, 429, 500, 502, 503, 504].includes(error?.status);
      if (!retryable) throw error;
      console.warn(`Gemini request unavailable for ${model}:`, error?.message);
    }
  }
  // Only on failure, consult the models actually exposed to this API key.
  // No model-discovery overhead for successful requests.
  if (!meaningfulError && lastError?.status === 404 && Date.now() < deadline - 8000) {
    try {
      const response = await fetch(`${API_BASE}?pageSize=100`, {
        headers: { "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(Math.min(7000, deadline - Date.now() - 1000)),
      });
      if (response.ok) {
        const data = await response.json();
        const offered = (data.models || [])
          .filter((item) => item.supportedGenerationMethods?.includes("generateContent"))
          .map((item) => String(item.name || "").replace(/^models\//, ""))
          .filter((name) => /^gemini-3\./.test(name) && /flash/.test(name) && !/image|live|tts|transcribe/.test(name));
        console.warn("Gemini configured model(s) unavailable. Flash models returned by key:", offered);
        for (const model of offered.filter((name) => !models.includes(name)).slice(0, 2)) {
          if (Date.now() >= deadline - 3000) break;
          const r = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
            body,
            signal: AbortSignal.timeout(Math.max(1000, Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now() - 1000))),
          });
          if (r.ok) {
            const data = await r.json();
            const output = (data.candidates?.[0]?.content?.parts || [])
              .filter((part) => typeof part.text === "string")
              .map((part) => part.text).join("\n").trim();
            if (output) return parseJSON(output);
          }
        }
      } else {
        console.warn("Gemini model discovery failed:", response.status);
      }
    } catch (error) {
      console.warn("Gemini model availability check failed:", error?.message);
    }
  }
  throw meaningfulError || lastError || new Error("Gemini service is temporarily unavailable.");
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
