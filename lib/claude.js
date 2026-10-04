// Server-only helper for calling the Gemini API.
// The API key never reaches the browser.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function askClaude({ system, content, maxTokens = 4000 }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to your Vercel project settings."
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const parts = (content || []).flatMap((block) => {
    if (block?.type === "text") {
      return [{ text: block.text }];
    }

    if (
      block?.type === "document" &&
      block.source?.type === "base64"
    ) {
      return [
        {
          inlineData: {
            mimeType: block.source.media_type,
            data: block.source.data,
          },
        },
      ];
    }

    return [];
  });

  if (!parts.length) {
    throw new Error("No usable content was provided to Gemini.");
  }

  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }],
        },

        contents: [
          {
            role: "user",
            parts,
          },
        ],

        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini API error ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const data = await response.json();

  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no usable response.");
  }

  return parseJSON(text);
}

function parseJSON(text) {
  const clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("The AI response was not valid JSON.");
  }

  return JSON.parse(clean.slice(start, end + 1));
}
