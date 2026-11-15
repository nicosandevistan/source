import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { people as peopleConfig } from "@/config/app";
import { parseConnections } from "@/lib/engine/discovery/connections";
import { createClient } from "@/lib/supabase/server";

export type ConnectionsImportResponse = { ok: true; imported: number } | { ok: false; error: string };
const json = (body: ConnectionsImportResponse, status = 200) => NextResponse.json(body, { status });

const body = z.object({ csv: z.string().max(peopleConfig.MAX_CONNECTIONS_CSV_CHARS) });

/**
 * Imports the user's LinkedIn Connections.csv. The browser takes it out of
 * the export ZIP and sends only that file. A new import replaces the
 * previous one; people added by hand are kept.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "Please sign in again." }, 401);

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "That file is too large or could not be read." }, 400);

  const people = parseConnections(parsed.data.csv).slice(0, peopleConfig.MAX_CONNECTIONS);
  if (people.length === 0) return json({ ok: false, error: "No connections found. Is this Connections.csv?" }, 400);

  const { error: clearError } = await supabase.from("people").delete().eq("source", "connections");
  if (clearError) return json({ ok: false, error: "Import failed. Nothing was changed." }, 500);

  for (let i = 0; i < people.length; i += 1000) {
    const { error } = await supabase.from("people").insert(
      people.slice(i, i + 1000).map((p) => ({
        source: "connections",
        full_name: p.fullName,
        company: p.company,
        title: p.title,
        linkedin_url: p.linkedinUrl,
        connected_on: p.connectedOn,
      })),
    );
    if (error) return json({ ok: false, error: "Import stopped partway. Try again." }, 500);
  }
  return json({ ok: true, imported: people.length });
}
