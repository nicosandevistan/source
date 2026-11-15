"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConnectionsImportResponse } from "@/app/api/people/import/route";
import { pickConnectionsFile } from "@/lib/engine/discovery/connections";

/** Takes Connections.csv out of the export ZIP in the browser and sends only that file. */
export function ImportConnections({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const csv = /\.zip$/i.test(file.name) ? pickConnectionsFile(bytes) : new TextDecoder().decode(bytes);
      if (!csv) {
        setMessage({ ok: false, text: "No Connections.csv in that ZIP. Request the export with Connections ticked." });
        return;
      }
      const response = await fetch("/api/people/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const result = (await response.json()) as ConnectionsImportResponse;
      setMessage(result.ok ? { ok: true, text: `Imported ${result.imported.toLocaleString("en-US")} connections.` } : { ok: false, text: result.error });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: "That file could not be read. Nothing was changed." });
    } finally {
      input.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
      <label className="block cursor-pointer space-y-1">
        <span className="block text-sm font-medium">
          {count ? `Update your LinkedIn connections (${count.toLocaleString("en-US")} now)` : "Import your LinkedIn connections"}
        </span>
        <span className="block text-xs text-neutral-600">
          The data export ZIP or just Connections.csv. Only that file leaves your device, and email addresses in it are not kept.
          A new import replaces the old one.
        </span>
        <input
          type="file"
          accept=".zip,.csv,application/zip,text/csv"
          disabled={busy}
          onChange={(e) => onFile(e.currentTarget)}
          className="mt-2 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
        {busy && <span className="block text-xs text-neutral-600">Reading…</span>}
      </label>
      {message && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
