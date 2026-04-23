"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPane } from "@/components/ChatPane";
import { TakeawayArtifact } from "@/components/TakeawayArtifact";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import {
  emptyExtraction,
  DEFAULT_ROLE_LABELS,
  type ConductorDecision,
  type ExtractionState,
  type Template,
  type Turn,
} from "@/lib/types";

// Client-side template registry — keeps this page statically importable.
const TEMPLATE_MAP: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
  [postIncidentTemplate.template_id]: postIncidentTemplate as unknown as Template,
  [civicTemplate.template_id]: civicTemplate as unknown as Template,
};

interface DeployedNoticePayload {
  type: string;
  strength: string;
  transcript_anchors: number[];
  observation: string;
  suggested_deploy_language?: string;
}

interface TurnResponse {
  decision: ConductorDecision;
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  notices?: {
    candidates: DeployedNoticePayload[];
    deployed: DeployedNoticePayload | null;
  };
  error?: string;
}

export default function ParticipantPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-dvh items-center justify-center bg-stone-50">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    }>
      <ParticipantPageContent params={params} />
    </Suspense>
  );
}

function ParticipantPageContent({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const searchParams = useSearchParams();
  const roundId = searchParams.get("round") ?? undefined;
  const template = TEMPLATE_MAP[templateId] ?? null;
  const roleLabels = template?.role_labels ?? DEFAULT_ROLE_LABELS;

  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [extraction, setExtraction] = useState<ExtractionState>(() =>
    template ? emptyExtraction(template) : emptyExtraction(founderTemplate as unknown as Template)
  );
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(
    template?.objectives[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [deployedNotices, setDeployedNotices] = useState<{ turn: number; type: string }[]>([]);
  const [objectiveStallTurns, setObjectiveStallTurns] = useState(0);
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [takeawayMarkdown, setTakeawayMarkdown] = useState<string | null>(null);
  const [takeawayGenerating, setTakeawayGenerating] = useState(false);
  const [takeawayError, setTakeawayError] = useState<string | null>(null);
  const openedRef = useRef(false);
  const startedAt = useRef(new Date().toISOString());

  const fetchTurn = useCallback(
    async (
      withTranscript: Turn[],
      withExtraction: ExtractionState,
      withActive: string | null
    ) => {
      if (!template) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: template.template_id,
            transcript: withTranscript,
            extraction: withExtraction,
            activeObjectiveId: withActive,
            startedAtIso: startedAt.current,
            deployedNotices,
            objectiveStallTurns,
          }),
        });
        const data = (await res.json()) as TurnResponse;
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

        const nextIndex = withTranscript.length;
        const deployed = data.notices?.deployed ?? null;
        const hostTurn: Turn = {
          index: nextIndex,
          role: "host",
          text: data.decision.next_utterance,
          at: new Date().toISOString(),
          anchor_turn:
            data.decision.move_type === "anchor_return" &&
            typeof data.decision.anchor_turn === "number"
              ? data.decision.anchor_turn
              : undefined,
          deployed_notice: deployed
            ? {
                type: deployed.type,
                anchors: deployed.transcript_anchors,
                observation: deployed.observation,
              }
            : undefined,
        };
        setTranscript([...withTranscript, hostTurn]);
        setExtraction(data.extraction);
        setObjectiveStallTurns((prev) =>
          data.activeObjectiveId === withActive ? prev + 1 : 0
        );
        setActiveObjectiveId(data.activeObjectiveId);
        if (deployed) {
          setDeployedNotices((prev) => [
            ...prev,
            { turn: nextIndex, type: deployed.type },
          ]);
        }
        if (data.decision.move_type === "wrap_up") setSessionClosed(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [template, deployedNotices]
  );

  useEffect(() => {
    if (!template || openedRef.current) return;
    openedRef.current = true;
    void fetchTurn([], emptyExtraction(template), template.objectives[0]?.id ?? null);
  }, [template, fetchTurn]);

  const handleSend = useCallback(
    (text: string) => {
      if (sessionClosed || !template) return;
      const nextIndex = transcript.length;
      const participantTurn: Turn = {
        index: nextIndex,
        role: "participant",
        text,
        at: new Date().toISOString(),
      };
      const nextTranscript = [...transcript, participantTurn];
      setTranscript(nextTranscript);
      void fetchTurn(nextTranscript, extraction, activeObjectiveId);
    },
    [transcript, extraction, activeObjectiveId, sessionClosed, template, fetchTurn]
  );

  const handleEndSession = useCallback(async () => {
    setSessionClosed(true);
    setTakeawayOpen(true);
    if (takeawayMarkdown || !template) return;
    setTakeawayGenerating(true);
    setTakeawayError(null);

    // Auto-save so the session appears in the round (non-fatal if it fails).
    void fetch("/api/save-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: template.template_id,
        transcript,
        extraction,
        activeObjectiveId,
        startedAtIso: startedAt.current,
        note: `participant:${template.template_id}`,
        roundId,
      }),
    }).catch(() => undefined);

    try {
      const res = await fetch("/api/takeaway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.template_id,
          transcript,
          extraction,
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok || !data.markdown) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTakeawayMarkdown(data.markdown);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTakeawayError(msg);
    } finally {
      setTakeawayGenerating(false);
    }
  }, [transcript, extraction, activeObjectiveId, template, takeawayMarkdown, roundId]);

  if (!template) {
    return (
      <div className="flex h-dvh items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-600 text-sm">Unknown brief: {templateId}</p>
          <a href="/" className="mt-3 block text-xs text-amber-700 underline">
            Return home
          </a>
        </div>
      </div>
    );
  }

  const participantTurnCount = transcript.filter((t) => t.role === "participant").length;

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            {template.name}
          </h1>
          <p className="text-xs text-stone-500">
            Your conversation · {roleLabels.participant}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sessionClosed && !takeawayOpen && takeawayMarkdown && (
            <button
              type="button"
              onClick={() => setTakeawayOpen(true)}
              className="rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-900"
            >
              View reflection
            </button>
          )}
          {!sessionClosed && (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={participantTurnCount < 2 || takeawayGenerating}
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              End & reflect
            </button>
          )}
          {sessionClosed && !takeawayOpen && !takeawayMarkdown && (
            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs text-stone-700">
              Session closed
            </span>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <ChatPane
          transcript={transcript}
          isLoading={isLoading}
          onSend={handleSend}
          disabled={sessionClosed}
          roleLabels={roleLabels}
        />
      </main>

      {takeawayOpen && (
        <TakeawayArtifact
          markdown={takeawayMarkdown}
          isGenerating={takeawayGenerating}
          error={takeawayError}
          onClose={() => setTakeawayOpen(false)}
        />
      )}
    </div>
  );
}
