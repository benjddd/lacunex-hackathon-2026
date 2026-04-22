import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

interface SessionSummary {
  session_id: string;
  saved_at: string | null;
  template_id: string | null;
  turn_count: number;
  note: string | null;
  has_takeaway: boolean;
}

// Reads transcripts/ on disk and returns a summary list. Dev-only: breaks on
// Vercel read-only FS. Fri deploy will either (a) replace with a client-side
// local store, (b) move storage to Vercel KV, or (c) hide this page in prod.
export async function GET() {
  const dir = path.join(process.cwd(), "transcripts");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    // No directory yet -> no sessions. That's fine.
    return NextResponse.json({ sessions: [] });
  }

  const takeawayIds = new Set(
    entries
      .filter((f) => f.startsWith("takeaway-") && f.endsWith(".md"))
      .map((f) => f.slice("takeaway-".length, -".md".length))
  );

  const sessionFiles = entries
    .filter((f) => f.startsWith("session-") && f.endsWith(".json"))
    .sort()
    .reverse(); // newest first — ISO timestamps sort correctly

  const sessions: SessionSummary[] = [];
  for (const file of sessionFiles) {
    const filepath = path.join(dir, file);
    try {
      const raw = await fs.readFile(filepath, "utf-8");
      const parsed = JSON.parse(raw) as {
        session_id?: string;
        saved_at?: string;
        template_id?: string;
        turn_count?: number;
        note?: string | null;
      };
      const session_id =
        parsed.session_id ?? file.slice("session-".length, -".json".length);
      sessions.push({
        session_id,
        saved_at: parsed.saved_at ?? null,
        template_id: parsed.template_id ?? null,
        turn_count: parsed.turn_count ?? 0,
        note: parsed.note ?? null,
        has_takeaway: takeawayIds.has(session_id),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[/api/sessions] skipping ${file}:`, msg);
    }
  }

  return NextResponse.json({ sessions });
}
