import { extractText } from "unpdf";

/** Plain text of a PDF, pages joined by blank lines. */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { text } = await extractText(bytes, { mergePages: false });
  return text.map((page) => page.trim()).join("\n\n").trim();
}
