import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hostedGetSession, hostedGetResearch, hostedSaveResearch } from "@/lib/store-hosted";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  runClaimVerifierAgent,
  type ManagedAgentUIEvent,
} from "@/lib/managed-agents";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Params {
  params: Promise<{ sessionId: string }>;
}

interface SessionDoc {
  transcript?: Turn[];
}

function transcriptToText(turns: Turn[]): string {
  return turns
    .map((t) => `[${t.role === "host" ? "Interviewer" : "Participant"} turn ${t.index}]: ${t.text}`)
    .join("\n\n");
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

async function loadCachedResearch(sessionId: string): Promise<string | null> {
  if (process.env.VERCEL) return hostedGetResearch(sessionId);
  try {
    return await fs.readFile(
      path.join(process.cwd(), "transcripts", `research-${sessionId}.md`),
      "utf-8"
    );
  } catch {
    return null;
  }
}

async function saveResearch(sessionId: string, report: string): Promise<void> {
  if (process.env.VERCEL) {
    await hostedSaveResearch(sessionId, report);
    return;
  }
  await fs.writeFile(
    path.join(process.cwd(), "transcripts", `research-${sessionId}.md`),
    report,
    "utf-8"
  );
}

type OutEvent =
  | ManagedAgentUIEvent
  | { type: "done"; report: string; cached: boolean; session_id?: string; active_seconds?: number }
  | { type: "fatal"; message: string };

function sseLine(event: OutEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// POST /api/sessions/[sessionId]/research
//
// Runs the claim-verifier Managed Agent against the session transcript.
// Responds with a text/event-stream so the UI can render the agent's
// tool calls and thinking as they happen, not only after the final report.
//
// Event types (all carried in SSE `data` frames as JSON):
//   status          — running | idle | terminated (+ stop_reason)
//   thinking        — the agent is making forward progress
//   tool_use        — web_search invocation, with the query
//   tool_result     — result block count + error flag
//   message_text    — a slice of the agent's response (usually one block)
//   error           — non-fatal session error
//   done            — terminal; includes the final report + session metadata
//   fatal           — terminal; request failed before completion
export async function POST(req: Request, { params }: Params) {
  const rl = await checkRateLimit(req, "expensive");
  if (!rl.ok && rl.response) return rl.response;

  const { sessionId } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  const cached = await loadCachedResearch(sessionId);
  const sessionDoc = cached ? null : await loadSession(sessionId);

  if (!cached) {
    if (!sessionDoc) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    if ((sessionDoc.transcript ?? []).length === 0) {
      return NextResponse.json({ error: "session has no transcript" }, { status: 400 });
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

        const transcript = sessionDoc!.transcript ?? [];
        const transcriptText =
          `Here is the interview transcript:\n\n${transcriptToText(transcript)}\n\nPlease identify the key verifiable claims and check them now.`;

        const result = await runClaimVerifierAgent({
          transcriptText,
          onEvent: (ev) => emit(ev),
        });

        await saveResearch(sessionId, result.report);
        emit({
          type: "done",
          report: result.report,
          cached: false,
          session_id: result.session_id,
          active_seconds: result.active_seconds,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[research] failed:", msg);
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
