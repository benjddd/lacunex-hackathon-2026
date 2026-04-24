"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DashboardPane } from "@/components/DashboardPane";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
import { DEFAULT_ROLE_LABELS, type ExtractionState, type Template, type Turn } from "@/lib/types";

interface SessionDoc {
  session_id: string;
  saved_at: string;
  template_id: string;
  template_json: Template | null;
  started_at: string | null;
  active_objective_id: string | null;
  note: string | null;
  turn_count: number;
  transcript: Turn[];
  extraction: ExtractionState;
}

const TEMPLATES: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
  [postIncidentTemplate.template_id]: postIncidentTemplate as unknown as Template,
  [civicTemplate.template_id]: civicTemplate as unknown as Template,
  [briefDesignerTemplate.template_id]: briefDesignerTemplate as unknown as Template,
};

// Managed Agents event types forwarded from the research route over SSE.
// Kept narrow on the client — only the fields the UI actually renders.
type ResearchServerEvent =
  | { type: "status"; status: "running" | "idle" | "terminated"; stop_reason?: string }
  | { type: "thinking" }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "tool_result"; is_error: boolean; block_count: number }
  | { type: "message_text"; text: string }
  | { type: "error"; message: string }
  | { type: "done"; report: string; cached: boolean; session_id?: string; active_seconds?: number }
  | { type: "fatal"; message: string };

// Non-terminal events that we keep in the log.
type ResearchEvent = Exclude<ResearchServerEvent, { type: "done" } | { type: "fatal" }>;

// Move-type badge styling — keyed by ConductorDecision.move_type values.
// Kept in-page because this is the only surface that renders them.
const MOVE_STYLES: Record<string, { label: string; cls: string }> = {
  probe_current: { label: "probe current", cls: "bg-stone-100 text-stone-700" },
  switch_objective: { label: "switch objective", cls: "bg-sky-100 text-sky-800" },
  deploy_meta_notice: { label: "deploy meta-notice", cls: "bg-emerald-100 text-emerald-800" },
  anchor_return: { label: "anchor return", cls: "bg-amber-100 text-amber-800" },
  wrap_up: { label: "wrap up", cls: "bg-violet-100 text-violet-800" },
};

// Per-turn audit panel — renders the conductor's reasoning, chosen move,
// and the meta-notice candidates (deployed and considered-but-not). Source
// of truth for the post-production video callouts: the exact phrasing you
// see here is what narration should quote.
function AuditPanel({ turn }: { turn: Turn }) {
  const hasData =
    !!turn.reasoning ||
    !!turn.move_type ||
    (turn.notice_candidates?.length ?? 0) > 0;
  if (!hasData) return null;
  const move = turn.move_type ? MOVE_STYLES[turn.move_type] : null;
  return (
    <div className="ml-2 mt-1 max-w-[75%] rounded-lg border border-dashed border-stone-300 bg-white/70 px-3 py-2 text-[11px] leading-relaxed">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-widest text-stone-400">
          platform audit
        </span>
        {move && (
          <span className={`rounded-full ${move.cls} px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider`}>
            {move.label}
          </span>
        )}
        {typeof turn.anchor_turn === "number" && (
          <span className="text-[10px] text-amber-700">↩ re-opened turn {turn.anchor_turn}</span>
        )}
      </div>
      {turn.reasoning && (
        <div className="mb-2">
          <div className="mb-0.5 text-[9px] uppercase tracking-wider text-stone-400">
            why this move
          </div>
          <p className="italic text-stone-700">{turn.reasoning}</p>
        </div>
      )}
      {turn.notice_candidates && turn.notice_candidates.length > 0 && (
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-stone-400">
            meta-notice candidates ({turn.notice_candidates.length})
          </div>
          <ul className="space-y-1.5">
            {turn.notice_candidates.map((c, i) => {
              const wasDeployed =
                turn.deployed_notice?.type === c.type &&
                JSON.stringify([...turn.deployed_notice.anchors].sort()) ===
                  JSON.stringify([...c.transcript_anchors].sort());
              return (
                <li
                  key={i}
                  className={`border-l-2 pl-2 ${wasDeployed ? "border-emerald-400" : "border-stone-200"}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider ${
                        wasDeployed ? "text-emerald-700" : "text-stone-400"
                      }`}
                    >
                      {wasDeployed ? "deployed" : "considered"}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {c.type} · {c.strength} · anchors [{c.transcript_anchors.join(", ")}]
                    </span>
                  </div>
                  <p className="mt-0.5 text-stone-700">{c.observation}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Live activity log of the claim-verifier Managed Agent. Renders each
// forwarded session event as one line so the audience can watch the
// agent decide what to search for, see results come back, and wait for
// the synthesis. Drops span.* / compaction events — those are noise here.
function ResearchActivityLog({
  events,
  running,
}: {
  events: ResearchEvent[];
  running: boolean;
}) {
  return (
    <div className="mt-4 rounded-lg border border-indigo-200/70 bg-white/80 p-3 font-mono text-[11px] leading-relaxed text-stone-700">
      <div className="mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-widest text-indigo-700">
        <span>agent events</span>
        {running && (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
        )}
      </div>
      {events.length === 0 ? (
        <p className="italic text-stone-500">
          Opening agent session…
        </p>
      ) : (
        <ul className="space-y-0.5">
          {events.map((ev, i) => {
            switch (ev.type) {
              case "status":
                return (
                  <li key={i} className="text-stone-500">
                    <span className="text-indigo-600">status</span> {ev.status}
                    {ev.stop_reason && (
                      <span className="text-stone-400"> · {ev.stop_reason}</span>
                    )}
                  </li>
                );
              case "thinking":
                return (
                  <li key={i} className="text-stone-500">
                    <span className="text-indigo-600">thinking</span>
                  </li>
                );
              case "tool_use": {
                const q =
                  typeof (ev.input as { query?: unknown })?.query === "string"
                    ? ((ev.input as { query: string }).query)
                    : JSON.stringify(ev.input).slice(0, 120);
                return (
                  <li key={i} className="text-stone-800">
                    <span className="text-emerald-700">{ev.name}</span>{" "}
                    <span className="text-stone-500">→</span>{" "}
                    <span className="italic">{q}</span>
                  </li>
                );
              }
              case "tool_result":
                return (
                  <li key={i} className="text-stone-500">
                    <span className={ev.is_error ? "text-red-700" : "text-emerald-700"}>
                      result
                    </span>{" "}
                    {ev.block_count} block{ev.block_count === 1 ? "" : "s"}
                    {ev.is_error && " (error)"}
                  </li>
                );
              case "message_text":
                return (
                  <li key={i} className="text-stone-800">
                    <span className="text-violet-700">message</span> {ev.text.length} chars
                  </li>
                );
              case "error":
                return (
                  <li key={i} className="text-red-700">
                    error · {ev.message}
                  </li>
                );
              default:
                return null;
            }
          })}
        </ul>
      )}
    </div>
  );
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [takeawayMd, setTakeawayMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [researchMd, setResearchMd] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchEvents, setResearchEvents] = useState<ResearchEvent[]>([]);
  const [researchMeta, setResearchMeta] = useState<{
    session_id?: string;
    active_seconds?: number;
  } | null>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<Template | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = (await res.json()) as {
          session?: SessionDoc;
          takeaway?: string | null;
          error?: string;
        };
        if (!res.ok || !data.session) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setSession(data.session);
          setTakeawayMd(data.takeaway ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const template = session
    ? (TEMPLATES[session.template_id] ?? session.template_json ?? null)
    : null;
  const roleLabels = template?.role_labels ?? DEFAULT_ROLE_LABELS;

  const handleResearch = async () => {
    if (researching) return;
    setResearching(true);
    setResearchError(null);
    setResearchEvents([]);
    setResearchMeta(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/research`, { method: "POST" });
      if (!res.ok) {
        const body = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(body) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          if (body) msg = body.slice(0, 300);
        }
        throw new Error(msg);
      }
      if (!res.body) throw new Error("no response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = frame
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const payload = dataLine.slice(6);
          let ev: ResearchServerEvent;
          try {
            ev = JSON.parse(payload) as ResearchServerEvent;
          } catch {
            continue;
          }
          if (ev.type === "done") {
            setResearchMd(ev.report);
            setResearchMeta({
              session_id: ev.session_id,
              active_seconds: ev.active_seconds,
            });
            done = true;
            break;
          }
          if (ev.type === "fatal") {
            setResearchError(ev.message);
            done = true;
            break;
          }
          setResearchEvents((prev) => [...prev, ev]);
        }
      }
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
    }
  };

  const handleGenerateBrief = async () => {
    if (generatingBrief) return;
    setGeneratingBrief(true);
    setBriefError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/generate-brief`, { method: "POST" });
      const data = (await res.json()) as { template?: Template; error?: string };
      if (!res.ok || !data.template) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGeneratedBrief(data.template);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingBrief(false);
    }
  };

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex · session
            </h1>
            <p className="truncate text-xs text-stone-500">
              {session
                ? `${template?.name ?? session.template_id} · ${session.turn_count} turns · ${new Date(session.saved_at).toLocaleString()}`
                : sessionId}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAuditOpen((v) => !v)}
              className={`rounded-md border px-3 py-1 text-xs transition ${
                auditOpen
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
              title="Show or hide the conductor's reasoning and meta-notice candidates per turn"
            >
              {auditOpen ? "Platform audit · on" : "Show platform audit"}
            </button>
            <Link
              href="/sessions"
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              ← All sessions
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {!session && !error && (
        <div className="px-6 py-8 text-sm text-stone-500">Loading…</div>
      )}

      {session && template && (
        <main className="flex min-h-0 flex-1">
          <div className="flex-1 min-w-0 border-r border-stone-200 bg-stone-50">
            <div className="mx-auto max-w-3xl px-8 py-6 space-y-4">
              {session.transcript.length === 0 ? (
                <p className="text-sm italic text-stone-400">(empty session)</p>
              ) : (
                session.transcript.map((turn) => {
                  const isHost = turn.role === "host";
                  return (
                    <div key={turn.index}>
                      <div className={`flex ${isHost ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            isHost
                              ? "bg-amber-50 text-stone-900 rounded-bl-sm"
                              : "bg-slate-800 text-white rounded-br-sm"
                          }`}
                        >
                          <div
                            className={`mb-1 text-[10px] uppercase tracking-wider ${
                              isHost ? "text-amber-800" : "text-slate-300"
                            }`}
                          >
                            {isHost ? roleLabels.host : roleLabels.participant}
                          </div>
                          <div className="whitespace-pre-wrap">{turn.text}</div>
                        </div>
                      </div>
                      {isHost && auditOpen && <AuditPanel turn={turn} />}
                    </div>
                  );
                })
              )}

              {takeawayMd && (
                <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-8">
                  <h2 className="mb-4 text-xs uppercase tracking-widest text-stone-500">
                    Participant reflection
                  </h2>
                  <article className="font-serif text-[15px] leading-relaxed text-stone-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-stone-500 [&_p]:mb-3 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:mb-1.5 [&_em]:italic [&_em]:text-stone-700 [&_strong]:font-semibold [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic">
                    <ReactMarkdown>{takeawayMd}</ReactMarkdown>
                  </article>
                </section>
              )}

              {/* Managed Agents: post-session claim verification */}
              <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xs uppercase tracking-widest text-indigo-700">
                      Claim Verification · Managed Agent
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      A Claude Managed Agent reads this transcript, identifies factual claims, and uses the <code>web_search</code> tool to verify each one. Events stream live from the agent session.
                    </p>
                  </div>
                  {!researchMd && (
                    <button
                      type="button"
                      onClick={() => void handleResearch()}
                      disabled={researching}
                      className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {researching ? "Agent working…" : "Run agent"}
                    </button>
                  )}
                </div>
                {researchError && (
                  <p className="mt-3 text-xs text-red-700">{researchError}</p>
                )}
                {(researching || researchEvents.length > 0) && !researchMd && (
                  <ResearchActivityLog events={researchEvents} running={researching} />
                )}
                {researchMd && (
                  <>
                    {researchMeta?.session_id && (
                      <p className="mt-3 text-[10px] font-mono text-stone-500">
                        session: {researchMeta.session_id}
                        {typeof researchMeta.active_seconds === "number" && (
                          <span> · active {researchMeta.active_seconds.toFixed(1)}s</span>
                        )}
                      </p>
                    )}
                    <article className="mt-4 text-[13px] leading-relaxed text-stone-800 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-2 [&_strong]:font-semibold">
                      <ReactMarkdown>{researchMd}</ReactMarkdown>
                    </article>
                  </>
                )}
              </section>

              {/* Brief Designer: generate a brief from this design conversation */}
              {session.template_id === "brief-designer" && (
                <section className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
                  <h2 className="text-xs uppercase tracking-widest text-violet-700">
                    Generate Brief
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    Turn this design conversation into a ready-to-use interview brief.
                  </p>
                  {briefError && (
                    <p className="mt-3 text-xs text-red-700">{briefError}</p>
                  )}
                  {!generatedBrief && (
                    <button
                      type="button"
                      onClick={() => void handleGenerateBrief()}
                      disabled={generatingBrief}
                      className="mt-3 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {generatingBrief ? "Generating brief…" : "Generate brief"}
                    </button>
                  )}
                  {generatedBrief && (
                    <div className="mt-3">
                      <p className="text-xs text-stone-700 font-medium">{generatedBrief.name}</p>
                      <p className="text-xs text-stone-500 mt-1">{generatedBrief.description}</p>
                      <button
                        type="button"
                        onClick={() => {
                          sessionStorage.setItem(
                            `lacunex:brief:${generatedBrief.template_id}`,
                            JSON.stringify(generatedBrief)
                          );
                          window.location.href = `/p/${generatedBrief.template_id}`;
                        }}
                        className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-900"
                      >
                        Start using this brief →
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          <div className="w-[400px] shrink-0">
            <DashboardPane
              template={template}
              extraction={session.extraction}
              activeObjectiveId={session.active_objective_id}
            />
          </div>
        </main>
      )}

      {session && !template && (
        <div className="px-6 py-8 text-sm text-red-700">
          Unknown brief: {session.template_id} — can&apos;t render the dashboard.
        </div>
      )}
    </div>
  );
}
