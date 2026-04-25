import { NextResponse } from "next/server";
import { isBypassRequest } from "@/lib/rate-limit";
import {
  hostedSaveRound,
  hostedSaveSession,
  hostedSaveTakeaway,
  hostedSaveResearch,
} from "@/lib/store-hosted";
import type { Round } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// One-shot admin path: seed a round + its sessions + their takeaways and
// research reports into the KV store. Used to push a locally-built cohort
// (transcripts/ on disk) into Vercel KV after deploy so judges can browse
// /rounds/<id>/aggregate on the public URL without re-running 11 sims.
//
// Auth: gated by the same bypass token that gates rate-limit (header
// x-bypass-token or cookie lacunex_bypass). Same trust boundary — anyone
// holding the team token can write here.
//
// Idempotent: hostedSave* are simple key writes; re-seeding overwrites.

interface SessionPayload {
  session_id: string;
  payload: unknown; // The full SessionDoc as written by /api/save-session
}

interface SeedPayload {
  round: Round;
  sessions: SessionPayload[];
  takeaways?: { session_id: string; markdown: string }[];
  research?: { session_id: string; report: string }[];
}

export async function POST(req: Request) {
  if (!isBypassRequest(req)) {
    return NextResponse.json(
      { error: "unauthorized — bypass token required" },
      { status: 401 }
    );
  }

  let body: SeedPayload;
  try {
    body = (await req.json()) as SeedPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.round || !Array.isArray(body.sessions)) {
    return NextResponse.json(
      { error: "payload must include `round` and `sessions[]`" },
      { status: 400 }
    );
  }

  let sessionsWritten = 0;
  let takeawaysWritten = 0;
  let researchWritten = 0;

  await hostedSaveRound(body.round);

  for (const s of body.sessions) {
    if (!s.session_id) continue;
    await hostedSaveSession(s.session_id, s.payload);
    sessionsWritten += 1;
  }

  if (Array.isArray(body.takeaways)) {
    for (const t of body.takeaways) {
      if (!t.session_id || typeof t.markdown !== "string") continue;
      await hostedSaveTakeaway(t.session_id, t.markdown);
      takeawaysWritten += 1;
    }
  }

  if (Array.isArray(body.research)) {
    for (const r of body.research) {
      if (!r.session_id || typeof r.report !== "string") continue;
      await hostedSaveResearch(r.session_id, r.report);
      researchWritten += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    round_id: body.round.round_id,
    sessions_written: sessionsWritten,
    takeaways_written: takeawaysWritten,
    research_written: researchWritten,
  });
}
