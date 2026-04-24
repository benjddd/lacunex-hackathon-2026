"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const inviteToken = searchParams.get("invite") ?? undefined;

  // Support dynamically-generated briefs stored in sessionStorage by /start
  const [generatedTemplate, setGeneratedTemplate] = useState<Template | null>(null);
  useEffect(() => {
    // Hydrate a dynamically-generated brief from sessionStorage on mount.
    // sessionStorage is a platform API outside React; reading it in an
    // effect is the correct place. React 19's set-state-in-effect rule
    // still flags the setState — safe here.
    if (!TEMPLATE_MAP[templateId] && templateId.startsWith("gen-")) {
      const raw = sessionStorage.getItem(`lacunex:brief:${templateId}`);
      if (raw) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setGeneratedTemplate(JSON.parse(raw) as Template);
        } catch { /* ignore */ }
      }
    }
  }, [templateId]);

  const template = TEMPLATE_MAP[templateId] ?? generatedTemplate;
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
  // Live "peek at your reflection" — a Sonnet-generated draft that refreshes
  // every 3 participant turns. Participant can open the drawer to peek and
  // close to continue. Final Opus pass still runs at session close.
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLastTurn, setPreviewLastTurn] = useState<number | null>(null);
  const previewLastTurnRef = useRef(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const openedRef = useRef(false);
  const startedAt = useRef(new Date().toISOString());
  const liveSessionId = useRef(
    new Date().toISOString().replace(/[:.]/g, "-") + "-live"
  );

  const PREVIEW_MIN_TURNS = 4;
  const PREVIEW_EVERY = 3;

  // Lighter Sonnet pass regenerating the participant's preview reflection
  // every PREVIEW_EVERY turns. Called from inside fetchTurn; declared first
  // here so the reference in fetchTurn's closure resolves at definition
  // time rather than via forward-capture (satisfies React 19's use-before-
  // declare rule).
  const regeneratePreview = useCallback(
    async (
      withTranscript: Turn[],
      withExtraction: ExtractionState,
      atParticipantCount: number
    ) => {
      if (!template) return;
      setPreviewGenerating(true);
      try {
        const res = await fetch("/api/takeaway", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: template.template_id,
            templateJson: generatedTemplate ?? undefined,
            transcript: withTranscript,
            extraction: withExtraction,
            mode: "preview",
          }),
        });
        const data = (await res.json()) as { markdown?: string; error?: string };
        if (res.ok && data.markdown) {
          setPreviewMarkdown(data.markdown);
          setPreviewLastTurn(atParticipantCount);
        }
        // Preview failures are silent — the button just stays in its current state.
      } catch {
        // non-fatal
      } finally {
        setPreviewGenerating(false);
      }
    },
    [template, generatedTemplate]
  );

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
            templateJson: generatedTemplate ?? undefined,
            transcript: withTranscript,
            extraction: withExtraction,
            activeObjectiveId: withActive,
            startedAtIso: startedAt.current,
            deployedNotices,
            objectiveStallTurns,
            liveSessionId: liveSessionId.current,
            inviteToken,
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
            ? {
                type: deployed.type,
                anchors: deployed.transcript_anchors,
                observation: deployed.observation,
              }
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
        const updatedTranscript = [...withTranscript, hostTurn];
        setTranscript(updatedTranscript);
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

        // Trigger a background takeaway preview regen every PREVIEW_EVERY
        // participant turns, once we have PREVIEW_MIN_TURNS of content. The
        // preview regen doesn't block the UI; participant keeps talking while
        // Sonnet works. Skipped on wrap_up (final Opus pass handles that).
        const participantCount = updatedTranscript.filter(
          (t) => t.role === "participant"
        ).length;
        const shouldRegenPreview =
          data.decision.move_type !== "wrap_up" &&
          participantCount >= PREVIEW_MIN_TURNS &&
          participantCount - previewLastTurnRef.current >= PREVIEW_EVERY;
        if (shouldRegenPreview) {
          previewLastTurnRef.current = participantCount;
          void regeneratePreview(updatedTranscript, data.extraction, participantCount);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [template, generatedTemplate, deployedNotices, objectiveStallTurns, inviteToken, regeneratePreview]
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
    // Don't auto-open — let participant choose when to reveal their reflection.
    if (takeawayMarkdown || !template) return;
    setTakeawayGenerating(true);
    setTakeawayError(null);

    // Save session first so we get the sessionId to pair with the takeaway.
    // Also handles round association. Non-fatal if it fails.
    let sessionId: string | undefined;
    try {
      const saveRes = await fetch("/api/save-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.template_id,
          templateJson: generatedTemplate ?? undefined,
          transcript,
          extraction,
          activeObjectiveId,
          startedAtIso: startedAt.current,
          note: `participant:${template.template_id}`,
          roundId,
        }),
      });
      if (saveRes.ok) {
        const saveData = (await saveRes.json()) as { sessionId?: string };
        sessionId = saveData.sessionId;
      }
    } catch {
      // save failure is non-fatal
    }

    try {
      const res = await fetch("/api/takeaway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: template.template_id,
          templateJson: generatedTemplate ?? undefined,
          sessionId,
          transcript,
          extraction,
          mode: "final",
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string; userMessage?: string };
      if (!res.ok || !data.markdown) throw new Error(data.userMessage ?? data.error ?? `HTTP ${res.status}`);
      setTakeawayMarkdown(data.markdown);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTakeawayError(msg);
    } finally {
      setTakeawayGenerating(false);
    }
  }, [transcript, extraction, activeObjectiveId, template, generatedTemplate, takeawayMarkdown, roundId]);

  if (!template) {
    return (
      <div className="flex h-dvh items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-600 text-sm">Unknown brief: {templateId}</p>
          <Link href="/" className="mt-3 block text-xs text-amber-700 underline">
            Return home
          </Link>
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
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/host/live/${liveSessionId.current}`;
              void navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              });
            }}
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-500 hover:bg-stone-50"
          >
            {linkCopied ? "Copied!" : "Share host view"}
          </button>
          {!sessionClosed && previewMarkdown && (
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              title="Your reflection is forming — take a peek, then come back to the conversation."
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100"
            >
              Peek at reflection
              {previewGenerating && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600 align-middle" />
              )}
            </button>
          )}
          {sessionClosed && !takeawayOpen && takeawayMarkdown && (
            <button
              type="button"
              onClick={() => setTakeawayOpen(true)}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-900 ring-2 ring-slate-300 ring-offset-1"
            >
              See your reflection →
            </button>
          )}
          {sessionClosed && takeawayGenerating && (
            <span className="text-xs text-stone-500 animate-pulse">
              Preparing your reflection…
            </span>
          )}
          {sessionClosed && takeawayError && !takeawayGenerating && !takeawayMarkdown && (
            <span className="text-xs text-red-600">Reflection failed — {takeawayError}</span>
          )}
          {!sessionClosed && (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={participantTurnCount < 2}
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              End & reflect
            </button>
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
          mode="final"
        />
      )}

      {previewOpen && !takeawayOpen && (
        <TakeawayArtifact
          markdown={previewMarkdown}
          isGenerating={previewGenerating}
          error={null}
          onClose={() => setPreviewOpen(false)}
          mode="preview"
          lastUpdatedTurn={previewLastTurn}
        />
      )}
    </div>
  );
}
