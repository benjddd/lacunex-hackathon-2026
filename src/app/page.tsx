"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPane } from "@/components/ChatPane";
import { DashboardPane } from "@/components/DashboardPane";
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

interface TurnResponse {
  decision: ConductorDecision;
  extraction: ExtractionState;
  activeObjectiveId: string | null;
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
            deployedNoticesCount: 0,
            lastNoticeTurn: null,
          }),
        });
        const data = (await res.json()) as TurnResponse;
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

        const nextIndex = withTranscript.length;
        const hostTurn: Turn = {
          index: nextIndex,
          role: "host",
          text: data.decision.next_utterance,
          at: new Date().toISOString(),
        };
        setTranscript([...withTranscript, hostTurn]);
        setExtraction(data.extraction);
        setActiveObjectiveId(data.activeObjectiveId);
        if (data.decision.move_type === "wrap_up") setSessionClosed(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
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
        path?: string;
        turns?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSaveStatus(`saved · ${data.path} · ${data.turns} turns`);
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
            CaptainSubtext
          </h1>
          <p className="text-xs text-stone-500">
            Goal-directed interview · {TEMPLATE.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-[11px] text-stone-500">{saveStatus}</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={transcript.length === 0}
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Save session
          </button>
          {sessionClosed && (
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

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPane
            transcript={transcript}
            isLoading={isLoading}
            onSend={handleParticipantSend}
            disabled={sessionClosed}
            roleLabels={ROLE_LABELS}
          />
        </div>
        <div className="w-[400px] shrink-0">
          <DashboardPane
            template={TEMPLATE}
            extraction={extraction}
            activeObjectiveId={activeObjectiveId}
          />
        </div>
      </main>
    </div>
  );
}
