"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPane } from "@/components/ChatPane";
import { DashboardPane } from "@/components/DashboardPane";
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

const ALL_TEMPLATES: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

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

// Keyed by template_id — remounts (resets all state) when template switches.
function SessionView({ template }: { template: Template }) {
  const roleLabels = template.role_labels ?? DEFAULT_ROLE_LABELS;
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [extraction, setExtraction] = useState<ExtractionState>(() =>
    emptyExtraction(template)
  );
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(
    template.objectives[0]?.id ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [deployedNotices, setDeployedNotices] = useState<{ turn: number; type: string }[]>([]);
  const [objectiveStallTurns, setObjectiveStallTurns] = useState(0);
  const [prevExtraction, setPrevExtraction] = useState<ExtractionState | null>(null);
  const [currentReasoning, setCurrentReasoning] = useState<string | null>(null);
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
        const data = (await res.json()) as TurnResponse & { userMessage?: string };
        if (!res.ok) throw new Error(data.userMessage ?? data.error ?? `HTTP ${res.status}`);

        const nextIndex = withTranscript.length;
        const deployed = data.notices?.deployed ?? null;
        const candidates = data.notices?.candidates ?? [];
        const hostTurn: Turn = {
          index: nextIndex,
          role: "host",
          text: data.decision.next_utterance,
          at: new Date().toISOString(),
          objective_id: data.activeObjectiveId ?? undefined,
          reasoning: data.decision.reasoning ?? undefined,
          move_type: data.decision.move_type,
          anchor_turn:
            data.decision.move_type === "anchor_return" &&
            typeof data.decision.anchor_turn === "number"
              ? data.decision.anchor_turn
              : undefined,
          deployed_notice: deployed
            ? { type: deployed.type, anchors: deployed.transcript_anchors, observation: deployed.observation }
            : undefined,
          notice_candidates: candidates.length
            ? candidates.map((n) => ({
                type: n.type,
                strength: n.strength,
                transcript_anchors: n.transcript_anchors,
                observation: n.observation,
              }))
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
          setDeployedNotices((prev) => [...prev, { turn: nextIndex, type: deployed.type }]);
        }
        if (data.decision.move_type === "wrap_up") setSessionClosed(true);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [template.template_id, deployedNotices, objectiveStallTurns]
  );

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;
    void fetchTurn([], emptyExtraction(template), template.objectives[0]?.id ?? null);
  }, [fetchTurn, template]);

  const handleParticipantSend = useCallback(
    (text: string) => {
      if (sessionClosed) return;
      const participantTurn: Turn = {
        index: transcript.length,
        role: "participant",
        text,
        at: new Date().toISOString(),
      };
      const next = [...transcript, participantTurn];
      setTranscript(next);
      void fetchTurn(next, extraction, activeObjectiveId);
    },
    [transcript, extraction, activeObjectiveId, sessionClosed, fetchTurn]
  );

  const handleEndSession = useCallback(async () => {
    setSessionClosed(true);
    setTakeawayOpen(true);
    if (takeawayMarkdown) return;
    setTakeawayGenerating(true);
    setTakeawayError(null);

    let sessionIdForPairing = savedSessionId;
    if (!sessionIdForPairing) {
      try {
        const saveRes = await fetch("/api/save-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: template.template_id,
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
      } catch { /* pairing is best-effort */ }
    }

    try {
      const res = await fetch("/api/takeaway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.template_id,
          transcript,
          extraction,
          sessionId: sessionIdForPairing,
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string; userMessage?: string };
      if (!res.ok || !data.markdown) throw new Error(data.userMessage ?? data.error ?? `HTTP ${res.status}`);
      setTakeawayMarkdown(data.markdown);
    } catch (err) {
      setTakeawayError(err instanceof Error ? err.message : String(err));
    } finally {
      setTakeawayGenerating(false);
    }
  }, [transcript, extraction, activeObjectiveId, savedSessionId, takeawayMarkdown, template.template_id]);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving…");
    try {
      const res = await fetch("/api/save-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.template_id,
          transcript,
          extraction,
          activeObjectiveId,
          startedAtIso: startedAt.current,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean; hosted?: boolean; sessionId?: string;
        payload?: unknown; path?: string; turns?: number; error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.hosted && data.payload) {
        const blob = new Blob([JSON.stringify(data.payload, null, 2)], { type: "application/json" });
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
      setSaveStatus(`save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [transcript, extraction, activeObjectiveId, template.template_id]);

  const participantTurns = transcript.filter((t) => t.role === "participant").length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {errorMsg && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
          {errorMsg}
        </div>
      )}
      {/* Session toolbar */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-b border-stone-100 bg-white px-6 py-2">
        {saveStatus && <span className="text-[11px] text-stone-500">{saveStatus}</span>}
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
          disabled={participantTurns < 2 || takeawayGenerating}
          className="rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-900 disabled:opacity-40"
        >
          {sessionClosed && takeawayMarkdown ? "View reflection" : "End & reflect"}
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <ChatPane
            transcript={transcript}
            isLoading={isLoading}
            onSend={handleParticipantSend}
            disabled={sessionClosed}
            roleLabels={roleLabels}
            showReasoning
            showHostMeta
          />
        </div>
        <div className="w-[400px] shrink-0">
          <DashboardPane
            template={template}
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

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-stone-50">
          <p className="text-sm text-stone-500">Loading…</p>
        </div>
      }
    >
      <DemoContent />
    </Suspense>
  );
}

function DemoContent() {
  const searchParams = useSearchParams();
  const briefParam = searchParams.get("brief");
  const initialId =
    briefParam && ALL_TEMPLATES.some((t) => t.template_id === briefParam)
      ? briefParam
      : ALL_TEMPLATES[0].template_id;
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialId);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const activeTemplate =
    ALL_TEMPLATES.find((t) => t.template_id === selectedTemplateId) ?? ALL_TEMPLATES[0];

  return (
    <div className="flex h-dvh flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="shrink-0">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex <span className="text-xs font-normal text-stone-500">(hackathon)</span>
            </h1>
            <p className="text-xs text-stone-500">
              {activeTemplate.role_labels?.host ?? DEFAULT_ROLE_LABELS.host} ·{" "}
              {activeTemplate.role_labels?.participant ?? DEFAULT_ROLE_LABELS.participant}
            </p>
          </div>
          {/* Brief selector — switching resets the session via key */}
          <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 p-1">
            {ALL_TEMPLATES.map((t) => (
              <button
                key={t.template_id}
                type="button"
                onClick={() => setSelectedTemplateId(t.template_id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTemplateId === t.template_id
                    ? "bg-white shadow-sm text-stone-900"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/host" className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50">
            Host hub
          </Link>
          <Link href="/rounds" className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50">
            Rounds
          </Link>
          <Link href="/sessions" className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50">
            Sessions
          </Link>
          <button
            type="button"
            onClick={() => setShowWalkthrough(true)}
            title="Feature walkthrough"
            className="rounded-full border border-stone-300 bg-white w-6 h-6 text-xs text-stone-500 hover:bg-stone-50 flex items-center justify-center"
          >
            ?
          </button>
        </div>
      </header>

      {/* Demo-mode notice */}
      <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/60 px-6 py-1.5 text-[11px] text-amber-800">
        <span>
          <span className="font-medium">Demo view</span> — host dashboard and participant chat on one screen.
          In production, participants use{" "}
          <Link href={`/p/${activeTemplate.template_id}`} className="underline hover:text-amber-900">
            /p/{activeTemplate.template_id}
          </Link>.
        </span>
        <Link href="/host" className="ml-4 shrink-0 font-medium underline hover:text-amber-900">
          Host hub →
        </Link>
      </div>

      {/* Session — key forces full remount (state reset) on template switch */}
      <SessionView key={selectedTemplateId} template={activeTemplate} />

      {showWalkthrough && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowWalkthrough(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-stone-900">What you&apos;re looking at</h2>
              <button type="button" onClick={() => setShowWalkthrough(false)} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm text-stone-700">
              <div className="space-y-3">
                <Feature label="Brief selector" desc="Three fully-wired briefs — Founder Investment Evaluation, Post-Incident Witness, Civic Consultation. Same four-call architecture, completely different domains. Switch brief to restart with a fresh session." />
                <Feature label="Left panel — participant chat" desc="Exactly what the participant sees at /p/[brief]. No dashboard, no badges. The AI conductor decides each question turn-by-turn from the full session state." />
                <Feature label="Right panel — host dashboard (live)" desc="Completeness bars fill in real time. Each objective tracks its own structured evidence. ↑/↓ arrows show confidence change per turn." />
                <Feature label="◆ meta-notice badges" desc="When the system detects a cross-turn pattern (contradiction, hedge, avoidance), it surfaces a badge citing ≥2 turn indices. The conductor decides whether to deploy it." />
                <Feature label="↩ anchor-return chips" desc="When the conductor re-opens a prior turn to probe further, a chip marks which earlier turn it returned to." />
              </div>
              <div className="border-t border-stone-100 pt-4 space-y-1 text-xs text-stone-500">
                <p><span className="font-medium text-stone-600">End &amp; reflect</span> — generates the participant&apos;s personalised takeaway.</p>
                <p><Link href="/host" className="text-amber-700 underline">Design a custom brief →</Link></p>
                <p><Link href="/rounds" className="text-amber-700 underline">See rounds &amp; cohort synthesis →</Link></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-lg bg-stone-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-0.5">{label}</p>
      <p className="text-xs leading-relaxed text-stone-700">{desc}</p>
    </div>
  );
}
