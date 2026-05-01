import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { callAggregate } from "@/lib/claude-calls";
import { hostedGetSession } from "@/lib/store-hosted";
import {
  isValidRoundId,
  readRound,
  setRoundAggregate,
} from "@/lib/rounds";
import { getTemplate } from "@/lib/templates";
import { checkRateLimit } from "@/lib/rate-limit";
import { demoGate } from "@/lib/demo-gate";
import type { AggregateInputSession } from "@/lib/prompts/aggregate";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300; // aggregation over N sessions may run 30-90s

interface Params {
  params: Promise<{ roundId: string }>;
}

interface SessionDoc {
  session_id: string;
  transcript: Turn[];
  extraction: ExtractionState;
}

// POST /api/rounds/[roundId]/aggregate — compute or re-compute the round's
// cross-participant aggregate. Loads each session from disk, calls Opus 4.7,
// writes the result back into the round record, returns the updated round.
export async function POST(req: Request, { params }: Params) {
  const gated = demoGate();
  if (gated) return gated;

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
      { error: "round has no sessions to aggregate" },
      { status: 400 }
    );
  }

  // Mark round as aggregating so the list UI can reflect it if it polls.
  round.status = "aggregating";
  // Not persisted yet — aggregation may fail, in which case status would
  // be wrong. Persist after success only.

  // Load sessions — in-memory store on Vercel, disk on local dev.
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
    const aggregate = await callAggregate({ template, sessions });
    // Always stamp with the server's timestamp — don't trust what the model
    // produced for generated_at.
    aggregate.generated_at = new Date().toISOString();
    aggregate.session_count = sessions.length;
    const updated = await setRoundAggregate(roundId, aggregate, "closed");
    return NextResponse.json({ round: updated, missing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/rounds/[id]/aggregate] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
