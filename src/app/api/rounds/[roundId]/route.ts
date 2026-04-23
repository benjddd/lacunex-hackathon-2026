import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  addSessionToRound,
  isValidRoundId,
  readRound,
} from "@/lib/rounds";
import { hostedGetSession } from "@/lib/store-hosted";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ roundId: string }>;
}

interface SessionDoc {
  session_id: string;
  saved_at: string;
  template_id: string;
  transcript: Turn[];
  extraction: ExtractionState;
  active_objective_id: string | null;
  note: string | null;
  turn_count: number;
}

// GET /api/rounds/[roundId] — returns the round + loaded sessions (transcripts
// inlined for the detail-page render) + the aggregate if computed.
export async function GET(_req: Request, { params }: Params) {
  const { roundId } = await params;
  if (!isValidRoundId(roundId)) {
    return NextResponse.json({ error: "invalid round id" }, { status: 400 });
  }
  const round = await readRound(roundId);
  if (!round) {
    return NextResponse.json({ error: "round not found" }, { status: 404 });
  }

  const sessions: SessionDoc[] = [];
  if (process.env.VERCEL) {
    for (const sid of round.session_ids) {
      const doc = hostedGetSession(sid) as SessionDoc | null;
      if (doc) sessions.push(doc);
    }
  } else {
    const dir = path.join(process.cwd(), "transcripts");
    for (const sid of round.session_ids) {
      try {
        const raw = await fs.readFile(path.join(dir, `session-${sid}.json`), "utf-8");
        sessions.push(JSON.parse(raw) as SessionDoc);
      } catch {
        // Missing session file — skip
      }
    }
  }

  return NextResponse.json({ round, sessions });
}

interface PatchBody {
  addSessionId?: string;
}

// POST (we use POST for add-session — idempotent by session id) — single
// endpoint for a couple of mutations to keep routes small.
export async function POST(req: Request, { params }: Params) {
  const { roundId } = await params;
  if (!isValidRoundId(roundId)) {
    return NextResponse.json({ error: "invalid round id" }, { status: 400 });
  }
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body.addSessionId) {
    const round = await addSessionToRound(roundId, body.addSessionId);
    if (!round) {
      return NextResponse.json({ error: "round not found" }, { status: 404 });
    }
    return NextResponse.json({ round });
  }
  return NextResponse.json({ error: "no recognized action" }, { status: 400 });
}
