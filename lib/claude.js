
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";


const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 20000;


const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function askClaude({
  system,
  content,
  maxTokens = 4000,
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

 
  const configuredModel = process.env.GEMINI_MODEL?.trim();

  if (
    configuredModel &&
    !/^[a-zA-Z0-9._-]+$/.test(configuredModel)
  ) {
    throw new Error(
      "Invalid GEMINI_MODEL configuration. Expected a model name, not an API key."
    );
  }

  const model = configuredModel || "gemini-2.5-flash-lite";

  console.info("Gemini model selected:", model);


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
    throw new Error(
      "No usable content was provided to Gemini."
    );
  }

  const body = JSON.stringify({
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
  });

 
  // Discover models available to this API key.
  const availableModels = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      pageSize: "100",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const listResponse = await fetch(
      `${API_BASE}?${params.toString()}`,
      {
        headers: {
          "x-goog-api-key": apiKey,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );

    if (!listResponse.ok) {
      throw new Error(
        `Gemini model discovery failed: HTTP ${listResponse.status}`
      );
    }

    const data = await listResponse.json();

    availableModels.push(
      ...(data.models || [])
    );

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  const supportedModels = availableModels
    .filter((item) =>
      item.supportedGenerationMethods?.includes(
        "generateContent"
      )
    )
    .map((item) =>
      item.name?.replace(/^models\//, "")
    )
    .filter(Boolean);

  const preferredModels = [
    model,
    ...supportedModels.filter((name) =>
      name.includes("flash") &&
      !name.includes("preview")
    ),
    ...supportedModels.filter((name) =>
      name.includes("flash")
    ),
  ];

  const fallbackModels = [
    ...new Set(preferredModels),
  ].filter((name) =>
    supportedModels.includes(name)
  );

  if (!fallbackModels.length) {
    throw new Error(
      "No Gemini generateContent models are available to this API key."
    );
  }

  console.info(
    "Available Gemini fallback models:",
    fallbackModels
  );



  let lastError;

  for (const currentModel of fallbackModels) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(
          `${API_BASE}/${encodeURIComponent(currentModel)}:generateContent`,
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

        if (response.ok) {
          const data = await response.json();

          const output = (
            data.candidates?.[0]?.content?.parts || []
          )
            .filter((part) => typeof part.text === "string")
            .map((part) => part.text)
            .join("\n")
            .trim();

          if (!output) {
            throw new Error(
              "Gemini returned no usable response."
            );
          }

          console.info(
            "Gemini request successful:",
            currentModel
          );

          return parseJSON(output);
        }

        const errorText = await response.text();

        lastError = new Error(
          `Gemini API error ${response.status} (${currentModel}): ${errorText.slice(0, 300)}`
        );

        console.error(
          `Gemini ${currentModel} attempt ${attempt}/${MAX_ATTEMPTS}: HTTP ${response.status}`
        );

        if ([400, 401, 403].includes(response.status)) {
          throw lastError;
        }

        if (response.status === 404) {
          break;
        }

        if (![429, 500, 502, 503, 504].includes(response.status)) {
          throw lastError;
        }
      } catch (error) {
        lastError = error;

        const message = String(error?.message || "");

        const retryable =
          error?.name === "TimeoutError" ||
          error?.name === "AbortError" ||
          error instanceof TypeError ||
          /Gemini API error (429|500|502|503|504)/.test(message);

        if (!retryable) {
          throw error;
        }

        console.error(
          `Gemini ${currentModel} attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
          message
        );
      }

      if (attempt < MAX_ATTEMPTS) {
        await wait(1000 * attempt);
      }
    }

    console.warn(
      "Trying next Gemini model after failure:",
      currentModel
    );
  }

  throw (
    lastError ||
    new Error("All Gemini models are unavailable.")
  );
}


function parseJSON(text) {
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error(
      "The AI response was not valid JSON."
    );
  }

  return JSON.parse(
    clean.slice(start, end + 1)
  );
}

