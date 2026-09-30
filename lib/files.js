import mammoth from "mammoth";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel request limit is ~4.5 MB

// Turns an uploaded file into Claude content blocks.
// PDFs are sent natively (Claude reads layout + text); DOCX/TXT are converted to text.
export async function fileToBlocks(file) {
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("No file received.");
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 4 MB. Compress it and try again.`);

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    return [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }];
  }
  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    if (!value.trim()) throw new Error(`${file.name} has no readable text.`);
    return [{ type: "text", text: value }];
  }
  if (name.endsWith(".txt")) {
    return [{ type: "text", text: buf.toString("utf8") }];
  }
  throw new Error(`${file.name} is not supported. Use PDF, DOCX or TXT.`);
}
