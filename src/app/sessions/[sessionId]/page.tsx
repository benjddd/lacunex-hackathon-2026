"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DashboardPane } from "@/components/DashboardPane";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
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
};

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
    try {
      const res = await fetch(`/api/sessions/${sessionId}/research`, { method: "POST" });
      const data = (await res.json()) as { report?: string; error?: string };
      if (!res.ok || !data.report) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResearchMd(data.report);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
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
          <Link
            href="/sessions"
            className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            ← All sessions
          </Link>
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
                    <div
                      key={turn.index}
                      className={`flex ${isHost ? "justify-start" : "justify-end"}`}
                    >
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
                      Claim Verification
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      An autonomous agent reads this transcript, identifies factual claims, and searches the web to verify each one.
                    </p>
                  </div>
                  {!researchMd && (
                    <button
                      type="button"
                      onClick={() => void handleResearch()}
                      disabled={researching}
                      className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {researching ? "Verifying claims…" : "Run agent"}
                    </button>
                  )}
                </div>
                {researchError && (
                  <p className="mt-3 text-xs text-red-700">{researchError}</p>
                )}
                {researchMd && (
                  <article className="mt-4 text-[13px] leading-relaxed text-stone-800 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_p]:mb-2 [&_strong]:font-semibold">
                    <ReactMarkdown>{researchMd}</ReactMarkdown>
                  </article>
                )}
              </section>
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
