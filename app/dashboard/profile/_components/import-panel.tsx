"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pickExportFiles } from "@/lib/engine/profile/linkedin-export";

type ImportResponse =
  | { ok: true; added: number; skipped: number; flagged: number; note?: string }
  | { ok: false; error: string };

type Kind = "linkedin_pdf" | "linkedin_export" | "resume";

const SOURCES: { kind: Kind; title: string; help: string; accept: string }[] = [
  {
    kind: "linkedin_pdf",
    title: "LinkedIn profile PDF",
    help: "On your own profile: More → Save to PDF.",
    accept: "application/pdf,.pdf",
  },
  {
    kind: "linkedin_export",
    title: "LinkedIn data export (ZIP)",
    help: "Settings → Data privacy → Get a copy of your data. Only your profile files leave your device; messages and connections do not.",
    accept: ".zip,application/zip",
  },
  {
    kind: "resume",
    title: "Resume (PDF, optional)",
    help: "Adds anything your LinkedIn is missing.",
    accept: "application/pdf,.pdf",
  },
];

async function upload(kind: Kind, file: File): Promise<ImportResponse> {
  let init: RequestInit;
  if (kind === "linkedin_export") {
    const files = pickExportFiles(new Uint8Array(await file.arrayBuffer()));
    init = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, files }),
    };
  } else {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    init = { method: "POST", body: form };
  }
  const response = await fetch("/api/profile/import", init);
  return (await response.json()) as ImportResponse;
}

function describe(result: ImportResponse): string {
  if (!result.ok) return result.error;
  const parts = [`Added ${result.added} ${result.added === 1 ? "entry" : "entries"}.`];
  if (result.skipped) parts.push(`${result.skipped} already on your profile.`);
  if (result.flagged) parts.push(`${result.flagged} could not be matched to the file's text. Check those first.`);
  if (result.note) parts.push(result.note);
  return parts.join(" ");
}

export function ImportPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState<Kind | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(kind: Kind, input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setBusy(kind);
    setMessage(null);
    try {
      const result = await upload(kind, file);
      setMessage({ ok: result.ok, text: describe(result) });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: "That file could not be read. Nothing was saved." });
    } finally {
      input.value = "";
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-3">
        {SOURCES.map((source) => (
          <li key={source.kind} className="rounded-md border border-neutral-200 bg-white p-3">
            <label className="block cursor-pointer space-y-1">
              <span className="block text-sm font-medium">{source.title}</span>
              <span className="block text-xs text-neutral-600">{source.help}</span>
              <input
                type="file"
                accept={source.accept}
                disabled={busy !== null}
                onChange={(event) => onFile(source.kind, event.currentTarget)}
                className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
              {busy === source.kind && <span className="block text-xs text-neutral-600">Reading…</span>}
            </label>
          </li>
        ))}
      </ul>
      {message && (
        <p
          role="status"
          className={`rounded-md px-3 py-2 text-sm ${
            message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
