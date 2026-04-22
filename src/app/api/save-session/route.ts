import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";

interface SaveRequest {
  templateId: string;
  transcript: Turn[];
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  startedAtIso?: string;
  note?: string;
}

export async function POST(req: Request) {
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = `session-${stamp}.json`;
  const dir = path.join(process.cwd(), "transcripts");
  const filepath = path.join(dir, filename);

  const payload = {
    saved_at: now.toISOString(),
    template_id: body.templateId,
    started_at: body.startedAtIso ?? null,
    active_objective_id: body.activeObjectiveId,
    note: body.note ?? null,
    turn_count: body.transcript.length,
    transcript: body.transcript,
    extraction: body.extraction,
  };

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/save-session] write failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: `transcripts/${filename}`,
    turns: body.transcript.length,
  });
}
