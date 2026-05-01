import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  hostedGetSession,
  hostedGetRoundResearch,
  hostedSaveRoundResearch,
} from "@/lib/store-hosted";
import { hostedGetRound } from "@/lib/store-hosted";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  runClaimVerifierAgent,
  type ManagedAgentUIEvent,
} from "@/lib/managed-agents";
import { demoGate } from "@/lib/demo-gate";
import type { Round, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

interface Params {
  params: Promise<{ roundId: string }>;
}

interface SessionDoc {
  session_id?: string;
  transcript?: Turn[];
}

// ---- Round + session loading (mirrors per-session route) ----

async function loadRound(roundId: string): Promise<Round | null> {
  if (process.env.VERCEL) return hostedGetRound(roundId);
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "transcripts", "rounds", `round-${roundId}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as Round;
  } catch {
    return null;
  }
}

async function loadSession(sessionId: string): Promise<SessionDoc | null> {
  if (process.env.VERCEL) {
    const doc = await hostedGetSession(sessionId);
    return (doc as SessionDoc) ?? null;
  }
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "transcripts", `session-${sessionId}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as SessionDoc;
  } catch {
    return null;
  }
}

// ---- SSE event types (mirror per-session route's `OutEvent`) ----

type OutEvent =
  | ManagedAgentUIEvent
  | {
      type: "done";
      report: string;
      cached: boolean;
      session_count?: number;
      session_id?: string;
      active_seconds?: number;
    }
  | { type: "fatal"; message: string };

function sseLine(event: OutEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Build the cohort transcript-text we hand to the claim-verifier. Per-session
// transcripts get a clear separator + index so the agent can attribute claims
// back to which resident said what. We trim to keep the prompt under the
// agent's context budget — most claim-bearing turns are short, and we keep
// every turn but cap each at 800 chars (rare overflows: long monologues).
const PER_TURN_CHAR_CAP = 800;

function buildCohortTranscript(
  sessions: { session_id: string; transcript: Turn[] }[]
): string {
  const blocks: string[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const { session_id, transcript } = sessions[i];
    const lines = transcript.map((t) => {
      const role = t.role === "host" ? "Interviewer" : "Resident";
      const text =
        t.text.length > PER_TURN_CHAR_CAP
          ? t.text.slice(0, PER_TURN_CHAR_CAP) + " […]"
          : t.text;
      return `[${role} turn ${t.index}]: ${text}`;
    });
    blocks.push(
      `=== SESSION ${i + 1} of ${sessions.length} (id ${session_id}) ===\n${lines.join("\n\n")}`
    );
  }
  return [
    "Here are the transcripts from a cohort of interviews — every resident in this round was asked about the same proposed local-government policy.",
    "Identify the factual claims that residents made which can be verified against external sources (statistics, policy details, comparable schemes in other cities, exemption rules, etc).",
    "For each verifiable claim, cite the session it came from, run web searches as needed, and produce a verdict (Supported / Partially supported / Refuted / Insufficient evidence) with the evidence you found.",
    "Group convergent claims that multiple residents made together so the cohort signal is visible.",
    "",
    blocks.join("\n\n"),
  ].join("\n\n");
}

// POST /api/rounds/[roundId]/research
//
// Cohort-level claim verification. Same Managed Agent (claim-verifier) as the
// per-session route, but the transcript handed to it is every session in the
// round concatenated, with session-attribution markers. The result is cached
// at `round_research:<roundId>` so a subsequent click returns instantly.
export async function POST(req: Request, { params }: Params) {
  const gated = demoGate();
  if (gated) return gated;

  const rl = await checkRateLimit(req, "expensive");
  if (!rl.ok && rl.response) return rl.response;

  const { roundId } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(roundId)) {
    return NextResponse.json({ error: "invalid round id" }, { status: 400 });
  }

  const cached = await hostedGetRoundResearch(roundId);
  const round = cached ? null : await loadRound(roundId);

  if (!cached) {
    if (!round) {
      return NextResponse.json({ error: "round not found" }, { status: 404 });
    }
    if (!round.session_ids?.length) {
      return NextResponse.json(
        { error: "round has no sessions to verify" },
        { status: 400 }
      );
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (ev: OutEvent) => {
        controller.enqueue(encoder.encode(sseLine(ev)));
      };

      try {
        if (cached) {
          emit({ type: "done", report: cached, cached: true });
          controller.close();
          return;
        }

        // Load every session in the round; skip silently if any are missing.
        const sessions: { session_id: string; transcript: Turn[] }[] = [];
        for (const sid of round!.session_ids) {
          const doc = await loadSession(sid);
          const transcript = doc?.transcript ?? [];
          if (transcript.length > 0) {
            sessions.push({ session_id: sid, transcript });
          }
        }
        if (sessions.length === 0) {
          emit({ type: "fatal", message: "no session transcripts available" });
          controller.close();
          return;
        }

        const transcriptText = buildCohortTranscript(sessions);

        const result = await runClaimVerifierAgent({
          transcriptText,
          onEvent: (ev) => emit(ev),
        });

        await hostedSaveRoundResearch(roundId, result.report);
        emit({
          type: "done",
          report: result.report,
          cached: false,
          session_count: sessions.length,
          session_id: result.session_id,
          active_seconds: result.active_seconds,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[round-research] failed:", msg);
        emit({ type: "fatal", message: msg });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// GET — return the cached report only (used by the aggregate page to show
// a previously-run verification without re-triggering the agent).
export async function GET(_req: Request, { params }: Params) {
  const { roundId } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(roundId)) {
    return NextResponse.json({ error: "invalid round id" }, { status: 400 });
  }
  const cached = await hostedGetRoundResearch(roundId);
  if (!cached) return NextResponse.json({ report: null }, { status: 200 });
  return NextResponse.json({ report: cached }, { status: 200 });
}
