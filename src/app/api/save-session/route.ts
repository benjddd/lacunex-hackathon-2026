import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { addSessionToRound, isValidRoundId } from "@/lib/rounds";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";

interface SaveRequest {
  templateId: string;
  transcript: Turn[];
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  startedAtIso?: string;
  note?: string;
  roundId?: string; // if provided, the saved session is added to the round
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
  const sessionId = stamp; // stable handle used to pair takeaways later

  // On Vercel (or any hosted env without a writable filesystem), return the
  // session payload for client-side download instead of writing to disk.
  // The interview loop, takeaway, and meta-noticing all work normally — only
  // server-side persistence is unavailable.
  const isHosted = !!process.env.VERCEL;
  if (isHosted) {
    const payload = {
      session_id: sessionId,
      saved_at: now.toISOString(),
      template_id: body.templateId,
      started_at: body.startedAtIso ?? null,
      active_objective_id: body.activeObjectiveId,
      note: body.note ?? null,
      turn_count: body.transcript.length,
      transcript: body.transcript,
      extraction: body.extraction,
    };
    return NextResponse.json({
      ok: true,
      hosted: true,
      sessionId,
      payload, // client downloads this as JSON
      turns: body.transcript.length,
    });
  }

  const filename = `session-${sessionId}.json`;
  const dir = path.join(process.cwd(), "transcripts");
  const filepath = path.join(dir, filename);

  const payload = {
    session_id: sessionId,
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

  let attachedToRound: string | null = null;
  if (body.roundId && isValidRoundId(body.roundId)) {
    const updated = await addSessionToRound(body.roundId, sessionId);
    attachedToRound = updated ? body.roundId : null;
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    path: `transcripts/${filename}`,
    turns: body.transcript.length,
    roundId: attachedToRound,
  });
}
