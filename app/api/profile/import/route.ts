import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { profile } from "@/config/app";
import { extractEntries } from "@/lib/engine/profile/extract";
import { isProfileExportFile, parseExportFiles } from "@/lib/engine/profile/linkedin-export";
import { extractPdfText } from "@/lib/engine/profile/pdf";
import { anthropicLlm } from "@/lib/llm/anthropic";
import { LlmNotConfiguredError } from "@/lib/llm/types";
import { saveDrafts } from "@/lib/profile/save";
import { createClient } from "@/lib/supabase/server";

export type ImportResponse =
  | { ok: true; added: number; skipped: number; flagged: number; note?: string }
  | { ok: false; error: string };

const json = (body: ImportResponse, status = 200) => NextResponse.json(body, { status });

const exportBody = z.object({
  kind: z.literal("linkedin_export"),
  files: z.record(z.string().max(200), z.string()),
});

/**
 * Imports the user's own profile.
 * - multipart form: `kind` = linkedin_pdf | resume, `file` = a PDF.
 * - JSON: `kind` = linkedin_export, `files` = CSV text by file name. The
 *   browser opens the ZIP and sends only the profile CSVs.
 * Uploaded files are read in memory and not stored.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return await importExport(await request.json());
    }
    return await importPdf(await request.formData());
  } catch (e) {
    if (e instanceof LlmNotConfiguredError) {
      return json(
        { ok: false, error: "PDF import is not set up yet. Use the data export ZIP or add entries by hand." },
        503,
      );
    }
    return json({ ok: false, error: "Import failed. Nothing was saved." }, 500);
  }
}

async function importExport(body: unknown) {
  const parsed = exportBody.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: "That upload could not be read." }, 400);

  const files = Object.fromEntries(
    Object.entries(parsed.data.files).filter(([name]) => isProfileExportFile(name)),
  );
  const size = Object.values(files).reduce((n, text) => n + text.length, 0);
  if (size > profile.MAX_EXPORT_CHARS) return json({ ok: false, error: "That export is too large." }, 413);

  const result = parseExportFiles(files);
  if (result.filesRead.length === 0) {
    return json({ ok: false, error: "No profile files were found in that ZIP." }, 400);
  }
  const saved = await saveDrafts(result.entries.slice(0, profile.MAX_ENTRIES_PER_IMPORT));
  return json({
    ok: true,
    ...saved,
    flagged: 0,
    note: result.filesFailed.length ? `Could not read: ${result.filesFailed.join(", ")}` : undefined,
  });
}

async function importPdf(form: FormData) {
  const kind = z.enum(["linkedin_pdf", "resume"]).safeParse(form.get("kind"));
  const file = form.get("file");
  if (!kind.success || !(file instanceof File)) {
    return json({ ok: false, error: "Choose a PDF to upload." }, 400);
  }
  if (file.size > profile.MAX_UPLOAD_BYTES) return json({ ok: false, error: "That file is too large." }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    return json({ ok: false, error: "That file is not a PDF." }, 400);
  }

  // Fail before reading the file if the LLM is not configured.
  const llm = anthropicLlm();
  let text: string;
  try {
    text = await extractPdfText(bytes);
  } catch {
    return json({ ok: false, error: "That PDF could not be read." }, 400);
  }
  if (text.length < 50) {
    return json({ ok: false, error: "No text found in that PDF. Is it a scan?" }, 400);
  }

  const result = await extractEntries(llm, text, kind.data);
  const saved = await saveDrafts(result.entries);
  return json({
    ok: true,
    ...saved,
    flagged: result.flagged,
    note: result.truncated ? "The file was long, so only the first part was read." : undefined,
  });
}
