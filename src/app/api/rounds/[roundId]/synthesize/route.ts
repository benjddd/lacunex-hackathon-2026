import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { callAggregate } from "@/lib/claude-calls";
import {
  isValidRoundId,
  readRound,
  setRoundLiveSynthesis,
} from "@/lib/rounds";
import { hostedGetSession } from "@/lib/store-hosted";
import { getTemplate } from "@/lib/templates";
import { checkRateLimit } from "@/lib/rate-limit";
import type { AggregateInputSession } from "@/lib/prompts/aggregate";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Params {
  params: Promise<{ roundId: string }>;
}

interface SessionDoc {
  session_id: string;
  transcript: Turn[];
  extraction: ExtractionState;
}

// POST /api/rounds/[roundId]/synthesize
// Live incremental synthesis for open rounds. Runs on-demand (host hits "Refresh")
// or auto-triggers when the round page loads. Unlike /aggregate (which closes the
// round and uses Opus), synthesize works on open rounds with as few as 1 session
// and writes to round.live_synthesis rather than round.aggregate.
//
// Uses the same Opus model as aggregate — quality is the value, not speed.
// Agents story: an agent that maintains a living picture as evidence accumulates.
export async function POST(req: Request, { params }: Params) {
  const rl = await checkRateLimit(req, "expensive");
  if (!rl.ok && rl.response) return rl.response;

  const { roundId } = await params;
  if (!isValidRoundId(roundId)) {
    return NextResponse.json({ error: "invalid round id" }, { status: 400 });
  }
  const round = await readRound(roundId);
  if (!round) {
    return NextResponse.json({ error: "round not found" }, { status: 404 });
  }
  const template = getTemplate(round.template_id);
  if (!template) {
    return NextResponse.json(
      { error: `unknown brief: ${round.template_id}` },
      { status: 400 }
    );
  }
  if (round.session_ids.length === 0) {
    return NextResponse.json(
      { error: "round has no sessions yet" },
      { status: 400 }
    );
  }

  const sessions: AggregateInputSession[] = [];
  const missing: string[] = [];

  if (process.env.VERCEL) {
    for (const sid of round.session_ids) {
      const doc = (await hostedGetSession(sid)) as SessionDoc | null;
      if (doc) {
        sessions.push({ session_id: sid, transcript: doc.transcript ?? [], extraction: doc.extraction });
      } else {
        missing.push(sid);
      }
    }
  } else {
    const dir = path.join(process.cwd(), "transcripts");
    for (const sid of round.session_ids) {
      try {
        const raw = await fs.readFile(path.join(dir, `session-${sid}.json`), "utf-8");
        const doc = JSON.parse(raw) as SessionDoc;
        sessions.push({ session_id: sid, transcript: doc.transcript ?? [], extraction: doc.extraction });
      } catch {
        missing.push(sid);
      }
    }
  }

  if (sessions.length === 0) {
    return NextResponse.json(
      { error: "no session files could be loaded", missing },
      { status: 500 }
    );
  }

  try {
    const synthesis = await callAggregate({ template, sessions });
    synthesis.generated_at = new Date().toISOString();
    synthesis.session_count = sessions.length;
    const updated = await setRoundLiveSynthesis(roundId, synthesis);
    return NextResponse.json({ round: updated, sessions_used: sessions.length, missing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/rounds/[id]/synthesize] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
