import { NextResponse } from "next/server";
import {
  callConductor,
  callExtraction,
  callMetaNoticing,
} from "@/lib/claude-calls";
import { getTemplate } from "@/lib/templates";
import type { MetaNotice } from "@/lib/prompts/meta-noticing";
import { emptyExtraction, type ExtractionState, type Turn } from "@/lib/types";
import { hostedSaveLiveSession } from "@/lib/store-hosted";
import { checkRateLimit, isBypassRequest } from "@/lib/rate-limit";
import { consumeInviteTurn, isValidToken, resolveInvite } from "@/lib/invites";
import { demoGate } from "@/lib/demo-gate";

export const runtime = "nodejs";
export const maxDuration = 90;

interface DeployedNoticeRef {
  turn: number;
  type: string;
}

interface TurnRequest {
  templateId: string;
  templateJson?: unknown; // full Template for gen-* briefs not in static registry
  transcript: Turn[];
  extraction?: ExtractionState;
  activeObjectiveId?: string | null;
  startedAtIso?: string;
  deployedNotices?: DeployedNoticeRef[];
  objectiveStallTurns?: number;
  liveSessionId?: string;
  // Layer 3: when present, caps turns to this invite's budget and ignores
  // any client-supplied templateId that doesn't match the invite's.
  inviteToken?: string | null;
}

export async function POST(req: Request) {
  const gated = demoGate();
  if (gated) return gated;

  const rl = await checkRateLimit(req, "turn");
  if (!rl.ok && rl.response) return rl.response;

  let body: TurnRequest;
  try {
    body = (await req.json()) as TurnRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Layer 3: if an invite token was supplied, bind to its budget and use its
  // template_id as authoritative (prevents a client from swapping briefs
  // mid-session to drain a cheap-brief budget through an expensive brief).
  // Bypass requests skip budget consumption but still honor the invite's
  // template_id so the team can rehearse invite-flow sessions without drain.
  let effectiveTemplateId = body.templateId;
  if (body.inviteToken) {
    if (!isValidToken(body.inviteToken)) {
      return NextResponse.json(
        {
          error: "invalid invite token",
          userMessage:
            "The invite token in the URL is malformed. Ask your host to send a fresh invite link.",
        },
        { status: 400 }
      );
    }
    if (isBypassRequest(req)) {
      const invite = await resolveInvite(body.inviteToken);
      if (!invite) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      effectiveTemplateId = invite.template_id;
    } else {
      const result = await consumeInviteTurn(body.inviteToken);
      if (!result.ok) {
        const status = result.reason === "budget_exhausted" ? 429 : 404;
        const userMessage =
          result.reason === "budget_exhausted"
            ? `This interview link has used its full turn budget (${result.invite?.turns_used}/${result.invite?.turn_budget}). Ask your host to send a fresh invite link to continue.`
            : "This invite link is not recognized. Ask your host to send a fresh invite link.";
        return NextResponse.json(
          {
            error: result.reason,
            budget: result.invite?.turn_budget,
            used: result.invite?.turns_used,
            userMessage,
          },
          { status }
        );
      }
      effectiveTemplateId = result.invite.template_id;
    }
  }

  const template =
    getTemplate(effectiveTemplateId) ??
    (body.templateJson ? (body.templateJson as import("@/lib/types").Template) : null);
  if (!template) {
    return NextResponse.json(
      { error: `unknown template: ${effectiveTemplateId}` },
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
  const deployedNotices = body.deployedNotices ?? [];
  const objectiveStallTurns = body.objectiveStallTurns ?? 0;
  const lastNoticeTurn =
    deployedNotices.length > 0
      ? deployedNotices[deployedNotices.length - 1].turn
      : null;

  const hasParticipantTurn = transcript.some((t) => t.role === "participant");
  const participantTurnCount = transcript.filter(
    (t) => t.role === "participant"
  ).length;

  // Meta-noticing skipped on:
  //   - the opening turn (no transcript yet)
  //   - while participant turn count < 2 (rapport phase; nothing cross-turn
  //     to notice yet — matches the conductor's suppression rule)
  //   - when the latest participant turn is too short to carry new signal
  //     ("yes", "not really", "I guess so"). Any notice available now was
  //     available last turn; skipping saves a model call with ~0 precision
  //     loss. 40 chars chosen empirically.
  // Past that, runs in parallel with extraction. Non-fatal — a failure
  // degrades to "no candidates" rather than killing the turn.
  const lastParticipantTurn = [...transcript]
    .reverse()
    .find((t) => t.role === "participant");
  const lastParticipantIsSubstantive =
    (lastParticipantTurn?.text.trim().length ?? 0) >= 40;
  const shouldRunNoticing =
    participantTurnCount >= 2 && lastParticipantIsSubstantive;
  const noticingPromise: Promise<MetaNotice[]> = shouldRunNoticing
    ? callMetaNoticing({
        template,
        transcript,
        alreadyDeployed: deployedNotices,
      }).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[/api/turn] meta-noticing failed (no candidates):", msg);
        return [];
      })
    : Promise.resolve([]);

  const extractionPromise: Promise<ExtractionState> = hasParticipantTurn
    ? callExtraction({ template, transcript, currentState: extraction }).catch(
        (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn("[/api/turn] extraction failed, preserving prior state:", msg);
          return extraction;
        }
      )
    : Promise.resolve(extraction);

  try {
    // Phase 1: meta-noticing + extraction in parallel. Conductor needs the
    // candidate notices to decide whether to deploy, so it runs after.
    const [candidateNotices, newExtraction] = await Promise.all([
      noticingPromise,
      extractionPromise,
    ]);

    const decision = await callConductor({
      template,
      transcript,
      extraction: newExtraction,
      activeObjectiveId,
      turnNumber,
      minutesElapsed,
      deployedNoticesCount: deployedNotices.length,
      lastNoticeTurn,
      candidateNotices,
      objectiveStallTurns,
    });

    // If the conductor chose deploy_meta_notice, match to the specific
    // candidate by type so the UI can render the notice's anchors + text.
    let deployed: MetaNotice | null = null;
    if (decision.move_type === "deploy_meta_notice") {
      deployed =
        candidateNotices.find((n) => n.type === decision.move_target) ??
        candidateNotices[0] ??
        null;
    }

    const nextActive =
      decision.move_type === "switch_objective" && decision.move_target !== "closing"
        ? decision.move_target
        : decision.move_type === "anchor_return" && decision.move_target
          ? decision.move_target
          : activeObjectiveId;

    // Best-effort live state save for /host/live/[sessionId] polling page.
    if (body.liveSessionId) {
      hostedSaveLiveSession(body.liveSessionId, {
        template_id: template.template_id,
        extraction: newExtraction,
        activeObjectiveId: nextActive,
        turn_count: transcript.length + 1,
        updated_at: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({
      decision,
      extraction: newExtraction,
      activeObjectiveId: nextActive,
      notices: {
        candidates: candidateNotices,
        deployed,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/turn] conductor error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
