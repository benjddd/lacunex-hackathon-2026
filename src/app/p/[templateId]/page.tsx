"use client";

import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatPane } from "@/components/ChatPane";
import { TakeawayArtifact } from "@/components/TakeawayArtifact";
import { LetterReflection } from "@/components/convergence/LetterReflection";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
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
  [briefDesignerTemplate.template_id]: briefDesignerTemplate as unknown as Template,
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

  // Support dynamically-generated briefs stored in sessionStorage by /host
  // (one-shot generator and Brief Designer terminal handoff).
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
  // Brief-designer terminal state. When this template runs to its end, the
  // "takeaway" the participant should see is the brief they just authored,
  // not a reflective letter. Set by handleEndSession when template_id is
  // "brief-designer"; rendered in place of LetterReflection.
  const [generatedBrief, setGeneratedBrief] = useState<Template | null>(null);
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

  const wrapUpHandledRef = useRef(false);

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
    if (takeawayMarkdown || generatedBrief || !template) return;
    setTakeawayGenerating(true);
    setTakeawayError(null);

    // Save session first so we get the sessionId to pair with the takeaway
    // (or with the brief generation, for brief-designer sessions).
    // Non-fatal if it fails.
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

    // Brief-designer terminal state diverges: instead of producing a
    // reflective takeaway for the host, distil the conversation into a brief
    // and show it as the artifact. The takeaway frame doesn't fit the meta
    // flow — the host's "reward" for completing brief-designer is the brief
    // itself.
    if (template.template_id === "brief-designer" && sessionId) {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/generate-brief`,
          { method: "POST" }
        );
        const data = (await res.json()) as {
          template?: Template;
          error?: string;
          userMessage?: string;
        };
        if (!res.ok || !data.template) {
          throw new Error(data.userMessage ?? data.error ?? `HTTP ${res.status}`);
        }
        setGeneratedBrief(data.template);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTakeawayError(msg);
      } finally {
        setTakeawayGenerating(false);
      }
      return;
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
  }, [transcript, extraction, activeObjectiveId, template, generatedTemplate, takeawayMarkdown, generatedBrief, roundId]);

  // Brief-designer terminal auto-trigger. When the conductor itself wraps up
  // the design conversation, the artifact (the brief) needs to be generated
  // without waiting for a manual click — otherwise the chat closes and there's
  // no path forward (the "End & reflect" button is hidden once sessionClosed).
  // For other templates, the manual end-button stays the conscious commit.
  useEffect(() => {
    if (
      sessionClosed &&
      template?.template_id === "brief-designer" &&
      !generatedBrief &&
      !takeawayGenerating &&
      !takeawayError &&
      !wrapUpHandledRef.current
    ) {
      wrapUpHandledRef.current = true;
      void handleEndSession();
    }
  }, [sessionClosed, template, generatedBrief, takeawayGenerating, takeawayError, handleEndSession]);

  // Auto-reveal the brief artifact for brief-designer once it's generated.
  // Per DEMO_SCRIPT.md Capture B: "brief card materialises at end" — no
  // intermediate click. Only applies to brief-designer; reflective takeaways
  // for participants stay manual.
  useEffect(() => {
    if (
      sessionClosed &&
      template?.template_id === "brief-designer" &&
      generatedBrief &&
      !takeawayOpen
    ) {
      setTakeawayOpen(true);
    }
  }, [sessionClosed, template, generatedBrief, takeawayOpen]);

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
          {sessionClosed && !takeawayOpen && generatedBrief && (
            <button
              type="button"
              onClick={() => setTakeawayOpen(true)}
              className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-900 ring-2 ring-slate-300 ring-offset-1"
            >
              See your brief →
            </button>
          )}
          {sessionClosed && takeawayGenerating && (
            <span className="text-xs text-stone-500 animate-pulse">
              {template?.template_id === "brief-designer"
                ? "Authoring your brief…"
                : "Preparing your reflection…"}
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
        {takeawayOpen && generatedBrief ? (
          // Brief-designer terminal state: the artifact is the brief itself,
          // not a reflective letter.
          <BriefAuthored brief={generatedBrief} />
        ) : takeawayOpen && takeawayMarkdown ? (
          // Surface transition: when the conversation has produced its final
          // reflection, the chat is replaced by the letter — no modal — so
          // the participant doesn't context-shift to read what they were just
          // part of writing. Per the Anchor-Web design (Surface E).
          <LetterReflection
            markdown={takeawayMarkdown}
            mode="final"
            turnCount={transcript.length}
            startedAt={transcript[0]?.at}
            onSavePdf={() => window.print()}
          />
        ) : previewOpen && !takeawayOpen && previewMarkdown ? (
          // Mid-conversation peek: full-screen takeover (Surface D₂½). Same
          // surface as the final letter; "conversation paused" header bar in
          // threadSoft; one button back to the chat. Replaces the prior
          // modal-drawer peek.
          <LetterReflection
            markdown={previewMarkdown}
            mode="peek"
            turnCount={transcript.filter((t) => t.role === "participant").length}
            lastRefreshedTurn={previewLastTurn ?? undefined}
            onReturnToConversation={() => setPreviewOpen(false)}
          />
        ) : (
          <ChatPane
            transcript={transcript}
            isLoading={isLoading}
            onSend={handleSend}
            disabled={sessionClosed}
            roleLabels={roleLabels}
          />
        )}
      </main>

      {/* Spinner / error stays in the modal artifact for the brief window
          before markdown arrives — surface transition only happens once we
          have something worth reading. */}
      {takeawayOpen && !takeawayMarkdown && (
        <TakeawayArtifact
          markdown={takeawayMarkdown}
          isGenerating={takeawayGenerating}
          error={takeawayError}
          onClose={() => setTakeawayOpen(false)}
          mode="final"
        />
      )}

      {previewOpen && !takeawayOpen && !previewMarkdown && (
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

// Brief-designer terminal surface. The conversation produced an interview
// brief — show it, list the objectives the host can expect, offer a single
// CTA to run it (sessionStorage handoff matches the path the one-shot
// generator on /host uses).
function BriefAuthored({ brief }: { brief: Template }) {
  const router = useRouter();

  const handleUseBrief = () => {
    sessionStorage.setItem(
      `lacunex:brief:${brief.template_id}`,
      JSON.stringify(brief)
    );
    router.push(`/p/${brief.template_id}`);
  };

  const aw = {
    bg: "#f7f6f2",
    surface: "#ffffff",
    ink: "#0c0c0a",
    ink2: "#2a2925",
    muted: "#6b6862",
    muted2: "#a8a49d",
    rule: "#e6e3dc",
    thread: "#b42318",
    threadSoft: "#fdf2f1",
    sans: "var(--font-anchor-sans), 'Inter Tight', system-ui, sans-serif",
    serif: "var(--font-anchor-serif), 'Instrument Serif', Georgia, serif",
    mono: "var(--font-anchor-mono), 'JetBrains Mono', ui-monospace, monospace",
  };

  return (
    <div
      style={{
        height: "100%",
        background: aw.surface,
        fontFamily: aw.sans,
        color: aw.ink,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "14px 28px",
          borderBottom: `1px solid ${aw.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: aw.sans,
            fontWeight: 500,
            fontSize: 16,
            letterSpacing: "-0.02em",
          }}
        >
          lacunex
        </div>
        <span
          style={{
            fontFamily: aw.mono,
            fontSize: 9,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: aw.muted,
          }}
        >
          your brief · ready
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 0 60px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 680,
            width: "100%",
            padding: "0 40px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: aw.mono,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: aw.thread,
              }}
            >
              the platform built this from your conversation
            </span>
            <h1
              style={{
                fontFamily: aw.serif,
                fontSize: 36,
                fontWeight: 400,
                letterSpacing: "-0.015em",
                lineHeight: 1.05,
                margin: "10px 0 6px",
                color: aw.ink,
              }}
            >
              {brief.name}
            </h1>
            {brief.role_labels && (
              <span
                style={{
                  fontFamily: aw.mono,
                  fontSize: 10,
                  color: aw.muted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {brief.role_labels.host} · {brief.role_labels.participant}
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: 15,
              color: aw.ink2,
              lineHeight: 1.65,
              margin: 0,
              fontFamily: aw.serif,
            }}
          >
            {brief.description}
          </p>

          <section>
            <span
              style={{
                fontFamily: aw.mono,
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: aw.muted,
              }}
            >
              {brief.objectives.length} objectives the conductor will probe
            </span>
            <ol style={{ marginTop: 12, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {brief.objectives.map((obj, i) => (
                <li
                  key={obj.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr",
                    gap: 12,
                    paddingTop: i > 0 ? 12 : 0,
                    borderTop: i > 0 ? `1px solid ${aw.rule}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: aw.mono,
                      fontSize: 11,
                      color: aw.muted2,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: aw.ink, lineHeight: 1.3 }}>
                      {obj.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: aw.muted, lineHeight: 1.55, marginTop: 4 }}>
                      {obj.goal}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div
            style={{
              padding: "16px 18px",
              background: aw.threadSoft,
              border: `1px solid ${aw.thread}`,
              fontSize: 13,
              color: aw.ink2,
              lineHeight: 1.6,
              fontFamily: aw.sans,
            }}
          >
            The brief is yours. Hit the button below to run it as a participant
            yourself, or share an invite link from the host hub. The same
            four-call architecture — conductor, extraction, meta-noticing,
            takeaway — that just authored this brief is what runs against your
            interviewees.
          </div>

          <button
            type="button"
            onClick={handleUseBrief}
            style={{
              width: "100%",
              padding: "14px 18px",
              background: aw.ink,
              color: aw.surface,
              border: "none",
              fontFamily: aw.mono,
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            run this brief →
          </button>
          <div style={{ textAlign: "center" }}>
            <a
              href="/host"
              style={{
                fontFamily: aw.mono,
                fontSize: 10,
                color: aw.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                borderBottom: `1px solid ${aw.rule}`,
                paddingBottom: 1,
              }}
            >
              back to host hub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
