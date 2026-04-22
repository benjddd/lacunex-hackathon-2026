import { NextResponse } from "next/server";
import { callConductor, callExtraction } from "@/lib/claude-calls";
import { getTemplate } from "@/lib/templates";
import { emptyExtraction, type ExtractionState, type Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TurnRequest {
  templateId: string;
  transcript: Turn[]; // full history, client-owned
  extraction?: ExtractionState; // optional; empty on opening turn
  activeObjectiveId?: string | null;
  startedAtIso?: string; // for minutes-elapsed computation
  deployedNoticesCount?: number;
  lastNoticeTurn?: number | null;
}

export async function POST(req: Request) {
  let body: TurnRequest;
  try {
    body = (await req.json()) as TurnRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json(
      { error: `unknown template: ${body.templateId}` },
      { status: 400 }
    );
  }

  const transcript = body.transcript ?? [];
  const extraction = body.extraction ?? emptyExtraction(template);
  const activeObjectiveId =
    body.activeObjectiveId ?? template.objectives[0]?.id ?? null;
  const turnNumber = transcript.filter((t) => t.role === "host").length;
  const startedAt = body.startedAtIso
    ? new Date(body.startedAtIso)
    : new Date();
  const minutesElapsed = Math.max(
    0,
    Math.round((Date.now() - startedAt.getTime()) / 60000)
  );

  // Conductor is required — if it fails the turn cannot continue. Extraction is
  // a nice-to-have — if it fails we keep the old dashboard state and let the
  // chat proceed. This keeps a long interview resilient to occasional extraction
  // truncation or schema hiccups.
  const hasParticipantTurn = transcript.some((t) => t.role === "participant");
  const extractionPromise = hasParticipantTurn
    ? callExtraction({ template, transcript, currentState: extraction })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[/api/turn] extraction failed, preserving prior state:", msg);
          return extraction;
        })
    : Promise.resolve(extraction);

  try {
    const [decision, newExtraction] = await Promise.all([
      callConductor({
        template,
        transcript,
        extraction,
        activeObjectiveId,
        turnNumber,
        minutesElapsed,
        deployedNoticesCount: body.deployedNoticesCount ?? 0,
        lastNoticeTurn: body.lastNoticeTurn ?? null,
      }),
      extractionPromise,
    ]);

    return NextResponse.json({
      decision,
      extraction: newExtraction,
      activeObjectiveId:
        decision.move_type === "switch_objective" ||
        decision.move_type === "deploy_meta_notice"
          ? decision.move_target === "closing"
            ? activeObjectiveId
            : decision.move_target
          : activeObjectiveId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/turn] conductor error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
