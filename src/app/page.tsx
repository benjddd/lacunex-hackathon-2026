"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPane } from "@/components/ChatPane";
import { DashboardPane } from "@/components/DashboardPane";
import { TakeawayArtifact } from "@/components/TakeawayArtifact";
import founderTemplate from "@/templates/founder-product-ideation.json";
import {
  emptyExtraction,
  DEFAULT_ROLE_LABELS,
  type ConductorDecision,
  type ExtractionState,
  type Template,
  type Turn,
} from "@/lib/types";

const TEMPLATE = founderTemplate as unknown as Template;
const ROLE_LABELS = TEMPLATE.role_labels ?? DEFAULT_ROLE_LABELS;

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

export default function Home() {
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [extraction, setExtraction] = useState<ExtractionState>(() =>
    emptyExtraction(TEMPLATE)
  );
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(
    TEMPLATE.objectives[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [deployedNotices, setDeployedNotices] = useState<
    { turn: number; type: string }[]
  >([]);
  const [objectiveStallTurns, setObjectiveStallTurns] = useState(0);
  const [prevExtraction, setPrevExtraction] = useState<ExtractionState | null>(null);
  const [currentReasoning, setCurrentReasoning] = useState<string | null>(null);
  const [takeawayOpen, setTakeawayOpen] = useState(false);
  const [takeawayMarkdown, setTakeawayMarkdown] = useState<string | null>(null);
  const [takeawayGenerating, setTakeawayGenerating] = useState(false);
  const [takeawayError, setTakeawayError] = useState<string | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const openedRef = useRef(false);
  const startedAt = useRef(new Date().toISOString());

  const fetchTurn = useCallback(
    async (
      withTranscript: Turn[],
      withExtraction: ExtractionState,
      withActive: string | null
    ) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: TEMPLATE.template_id,
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
          objective_id: data.activeObjectiveId ?? undefined,
          reasoning: data.decision.reasoning ?? undefined,
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
        setPrevExtraction(withExtraction);
        setExtraction(data.extraction);
        setCurrentReasoning(data.decision.reasoning ?? null);
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
    [deployedNotices]
  );

  // Kick off the opening turn once on mount.
  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void fetchTurn([], emptyExtraction(TEMPLATE), TEMPLATE.objectives[0]?.id ?? null);
  }, [fetchTurn]);

  const handleParticipantSend = useCallback(
    (text: string) => {
      if (sessionClosed) return;
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
    [transcript, extraction, activeObjectiveId, sessionClosed, fetchTurn]
  );

  const handleEndSession = useCallback(async () => {
    // Close the session first so the participant can't send more messages
    // while we're generating.
    setSessionClosed(true);
    setTakeawayOpen(true);
    // Reuse cached markdown if already generated.
    if (takeawayMarkdown) return;
    setTakeawayGenerating(true);
    setTakeawayError(null);

    // Save first (if we haven't already) so the takeaway can be paired with a
    // session file on disk. Both failures are non-fatal for the takeaway flow.
    let sessionIdForPairing = savedSessionId;
    if (!sessionIdForPairing) {
      try {
        const saveRes = await fetch("/api/save-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: TEMPLATE.template_id,
            transcript,
            extraction,
            activeObjectiveId,
            startedAtIso: startedAt.current,
            note: "ended-in-ui",
          }),
        });
        const saveData = (await saveRes.json()) as { sessionId?: string };
        if (saveRes.ok && saveData.sessionId) {
          sessionIdForPairing = saveData.sessionId;
          setSavedSessionId(sessionIdForPairing);
        }
      } catch {
        // Pairing best-effort only; takeaway still generates without it.
      }
    }

    try {
      const res = await fetch("/api/takeaway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: TEMPLATE.template_id,
          transcript,
          extraction,
          sessionId: sessionIdForPairing,
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
  }, [transcript, extraction, activeObjectiveId, savedSessionId, takeawayMarkdown]);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving…");
    try {
      const res = await fetch("/api/save-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: TEMPLATE.template_id,
          transcript,
          extraction,
          activeObjectiveId,
          startedAtIso: startedAt.current,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        hosted?: boolean;
        sessionId?: string;
        payload?: unknown;
        path?: string;
        turns?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.hosted && data.payload) {
        // Hosted env (Vercel): trigger client-side JSON download instead.
        const blob = new Blob([JSON.stringify(data.payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${data.sessionId ?? Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        if (data.sessionId) setSavedSessionId(data.sessionId);
        setSaveStatus(`downloaded · ${data.turns} turns`);
      } else {
        if (!data.ok) throw new Error(data.error ?? "save failed");
        if (data.sessionId) setSavedSessionId(data.sessionId);
        setSaveStatus(`saved · ${data.path} · ${data.turns} turns`);
      }
      setTimeout(() => setSaveStatus(null), 8000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus(`save failed: ${msg}`);
    }
  }, [transcript, extraction, activeObjectiveId]);

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            Ambitext
          </h1>
          <p className="text-xs text-stone-500">
            Goal-directed interview · {TEMPLATE.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-[11px] text-stone-500">{saveStatus}</span>
          )}
          <Link
            href="/host"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Host hub
          </Link>
          <Link
            href="/rounds"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Rounds
          </Link>
          <Link
            href="/sessions"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Past sessions
          </Link>
          <button
            type="button"
            onClick={() => setShowWalkthrough(true)}
            title="Feature walkthrough"
            className="rounded-full border border-stone-300 bg-white w-6 h-6 text-xs text-stone-500 hover:bg-stone-50 flex items-center justify-center"
          >
            ?
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={transcript.length === 0}
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Save session
          </button>
          <button
            type="button"
            onClick={handleEndSession}
            disabled={transcript.filter((t) => t.role === "participant").length < 2 || takeawayGenerating}
            className="rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-900 disabled:opacity-40"
          >
            {sessionClosed && takeawayMarkdown ? "View reflection" : "End & reflect"}
          </button>
          {sessionClosed && !takeawayOpen && (
            <span className="rounded-full bg-stone-200 px-3 py-1 text-xs text-stone-700">
              Session closed
            </span>
          )}
        </div>
      </header>

      {/* Demo-mode notice — this combined view is for evaluation convenience.
          In production the participant gets /p/[brief] and sees no dashboard. */}
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-6 py-1.5 text-[11px] text-amber-800">
        <span>
          <span className="font-medium">Demo view</span> — host dashboard and participant chat shown together.
          In production, participants use{" "}
          <Link href={`/p/${TEMPLATE.template_id}`} className="underline hover:text-amber-900">
            /p/{TEMPLATE.template_id}
          </Link>{" "}
          (no dashboard visible to them).
        </span>
        <Link href="/host" className="ml-4 shrink-0 font-medium underline hover:text-amber-900">
          Host hub →
        </Link>
      </div>

      {errorMsg && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPane
            transcript={transcript}
            isLoading={isLoading}
            onSend={handleParticipantSend}
            disabled={sessionClosed}
            roleLabels={ROLE_LABELS}
            showReasoning
            showHostMeta
          />
        </div>
        <div className="w-[400px] shrink-0">
          <DashboardPane
            template={TEMPLATE}
            extraction={extraction}
            prevExtraction={prevExtraction}
            activeObjectiveId={activeObjectiveId}
            transcript={transcript}
            currentReasoning={currentReasoning}
          />
        </div>
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
