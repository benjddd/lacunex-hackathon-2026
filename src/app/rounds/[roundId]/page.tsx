"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import {
  DEFAULT_ROLE_LABELS,
  type AggregatePattern,
  type ExtractionState,
  type Round,
  type Template,
  type Turn,
} from "@/lib/types";

interface SessionDoc {
  session_id: string;
  saved_at: string;
  template_id: string;
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

export default function RoundDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = use(params);
  const [round, setRound] = useState<Round | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aggregating, setAggregating] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rounds/${roundId}`);
      const data = (await res.json()) as {
        round?: Round;
        sessions?: SessionDoc[];
        error?: string;
      };
      if (!res.ok || !data.round) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRound(data.round);
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [roundId]);

  useEffect(() => {
    // load() fetches from REST and commits via setState — canonical client
    // hydration pattern. React 19's set-state-in-effect rule flags it; safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleAggregate = async () => {
    if (aggregating) return;
    setAggregating(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${roundId}/aggregate`, { method: "POST" });
      const data = (await res.json()) as { round?: Round; error?: string };
      if (!res.ok || !data.round) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRound(data.round);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAggregating(false);
    }
  };

  const handleSynthesize = async () => {
    if (synthesizing) return;
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch(`/api/rounds/${roundId}/synthesize`, { method: "POST" });
      const data = (await res.json()) as { round?: Round; sessions_used?: number; error?: string };
      if (!res.ok || !data.round) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRound(data.round);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSynthesizing(false);
    }
  };

  const template = round ? TEMPLATES[round.template_id] : null;
  const roleLabels = template?.role_labels ?? DEFAULT_ROLE_LABELS;

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              {round?.label ?? roundId}
            </h1>
            <p className="truncate text-xs text-stone-500">
              {round
                ? `${template?.name ?? round.template_id} · ${round.session_ids.length} session${
                    round.session_ids.length === 1 ? "" : "s"
                  } · ${new Date(round.created_at).toLocaleString()}`
                : "loading…"}
            </p>
          </div>
          <Link
            href="/rounds"
            className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            ← All rounds
          </Link>
        </div>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {!round && !error && (
        <div className="px-6 py-8 text-sm text-stone-500">Loading…</div>
      )}

      {round && (
        <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">

          {/* Response funnel stats */}
          <RoundStats round={round} sessions={sessions} />

          <section className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-stone-500 mb-2">Participant link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-stone-50 px-3 py-1.5 text-xs text-stone-800 border border-stone-200 select-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/p/{round.template_id}?round={round.round_id}
              </code>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(
                  `${window.location.origin}/p/${round.template_id}?round=${round.round_id}`
                )}
                className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
              >
                Copy
              </button>
              <a
                href={`/p/${round.template_id}?round=${round.round_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
              >
                Open ↗
              </a>
            </div>
          </section>

          {/* Live synthesis — runs on open rounds with ≥1 session, updates on refresh */}
          {round.status !== "closed" && (
            <section className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs uppercase tracking-wider text-indigo-700 font-medium">
                    Live cohort signal
                  </p>
                  <p className="mt-1 text-xs text-stone-600">
                    {round.live_synthesis
                      ? `${round.live_synthesis.session_count} session${round.live_synthesis.session_count === 1 ? "" : "s"} · updated ${new Date(round.live_synthesis.generated_at).toLocaleString()}`
                      : round.session_ids.length === 0
                        ? "Collect at least one session, then refresh to see early signal."
                        : "An agent reads all sessions and surfaces emerging patterns. Runs incrementally — no need to close the round first."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSynthesize()}
                  disabled={synthesizing || round.session_ids.length === 0}
                  className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {synthesizing ? "Synthesizing…" : round.live_synthesis ? "Refresh signal" : "Run live synthesis"}
                </button>
              </div>
              {round.live_synthesis && (
                <div className="mt-4">
                  <AggregateView
                    aggregate={round.live_synthesis}
                    sessionLookup={Object.fromEntries(sessions.map((s) => [s.session_id, s]))}
                    roleLabels={roleLabels}
                  />
                </div>
              )}
            </section>
          )}

          <section className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs uppercase tracking-wider text-stone-500">
                Final aggregate
              </p>
              <p className="mt-1 text-sm text-stone-700">
                {round.aggregate
                  ? `Generated ${new Date(round.aggregate.generated_at).toLocaleString()} · ${round.aggregate.session_count} sessions`
                  : round.session_ids.length === 0
                    ? "Attach at least one session, then generate."
                    : "Closes the round and produces the definitive cross-participant picture."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void handleAggregate()}
                disabled={aggregating || round.session_ids.length === 0}
                className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40"
              >
                {aggregating ? "Aggregating…" : round.aggregate ? "Regenerate" : "Generate final aggregate"}
              </button>
              {round.aggregate && (
                <Link
                  href={`/rounds/${roundId}/aggregate`}
                  className="rounded-md border border-stone-900 bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                >
                  Open convergence map →
                </Link>
              )}
            </div>
          </section>

          {round.aggregate && (
            <AggregateView
              aggregate={round.aggregate}
              sessionLookup={Object.fromEntries(sessions.map((s) => [s.session_id, s]))}
              roleLabels={roleLabels}
            />
          )}

          <section>
            <h2 className="mb-3 text-xs uppercase tracking-wider text-stone-500">
              Sessions in this round
            </h2>
            {round.session_ids.length === 0 && (
              <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600">
                No sessions attached yet. From the interview screen, save a session
                and attach it to this round (forthcoming UI); or use the sim CLI:
                <pre className="mt-2 rounded bg-stone-100 px-2 py-1 text-[11px] text-stone-800">npm run sim -- --persona=&lt;id&gt; --turns=6 --round={round.round_id}</pre>
              </div>
            )}
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.session_id}>
                  <Link
                    href={`/sessions/${s.session_id}`}
                    className="block rounded-lg border border-stone-200 bg-white px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/20"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-stone-900">
                          {s.note ? `${s.note} · ` : ""}
                          {s.turn_count} turn{s.turn_count === 1 ? "" : "s"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-stone-500">
                          {new Date(s.saved_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-stone-400">{s.session_id}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </main>
      )}
    </div>
  );
}

const COMPLETION_THRESHOLD = 6; // turn_count ≥ this = session treated as completed

function RoundStats({
  round,
  sessions,
}: {
  round: Round;
  sessions: SessionDoc[];
}) {
  const target = round.target_participant_count;
  const started = sessions.length;
  const completed = sessions.filter((s) => s.turn_count >= COMPLETION_THRESHOLD).length;
  const partial = started - completed;
  const responseRate = target ? Math.round((started / target) * 100) : null;
  const completionRate = started > 0 ? Math.round((completed / started) * 100) : null;

  const stat = (label: string, value: string | number, sub?: string, highlight?: boolean) => (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`text-2xl font-bold tabular-nums ${highlight ? "text-amber-700" : "text-stone-800"}`}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-stone-500">{label}</span>
      {sub && <span className="text-[10px] text-stone-400">{sub}</span>}
    </div>
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-6 sm:gap-10">
        {target != null && stat("Target", target)}
        {stat("Started", started, responseRate != null ? `${responseRate}% of target` : undefined)}
        {stat("Completed", completed, completionRate != null ? `${completionRate}% of started` : undefined, completed > 0)}
        {partial > 0 && stat("Partial / abandoned", partial)}
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span className="text-xs text-stone-500">
            Opened {new Date(round.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {round.target_date && (
            <span className="text-xs text-stone-500">
              Closes {new Date(round.target_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              round.status === "closed"
                ? "bg-stone-100 text-stone-500"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {round.status}
          </span>
        </div>
      </div>
      {started > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${completionRate ?? 0}%` }}
          />
        </div>
      )}
    </section>
  );
}

function AggregateView({
  aggregate,
  sessionLookup,
  roleLabels,
}: {
  aggregate: NonNullable<Round["aggregate"]>;
  sessionLookup: Record<string, SessionDoc>;
  roleLabels: typeof DEFAULT_ROLE_LABELS;
}) {
  return (
    <section className="space-y-6 rounded-2xl border border-amber-200 bg-amber-50/30 p-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-amber-800">
          Aggregate · cohort picture
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {aggregate.session_count} session{aggregate.session_count === 1 ? "" : "s"}
        </p>
      </header>

      <p className="text-sm leading-relaxed text-stone-900">{aggregate.summary}</p>

      {aggregate.top_themes.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] uppercase tracking-wider text-stone-500">
            Top themes
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {aggregate.top_themes.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] text-stone-800 ring-1 ring-stone-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {aggregate.patterns.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] uppercase tracking-wider text-stone-500">
            Patterns across the cohort
          </h3>
          <ul className="space-y-3">
            {aggregate.patterns.map((p, i) => (
              <PatternCard
                key={i}
                pattern={p}
                sessionLookup={sessionLookup}
                participantLabel={roleLabels.participant}
              />
            ))}
          </ul>
        </div>
      )}

      {aggregate.routing_recommendations.length > 0 && (
        <div>
          <h3 className="mb-2 text-[11px] uppercase tracking-wider text-stone-500">
            Worth looping in
          </h3>
          <ul className="space-y-2">
            {aggregate.routing_recommendations.map((r, i) => (
              <li key={i} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
                <p className="text-sm text-stone-900">
                  <span className="font-medium">{r.audience}</span> — {r.finding}
                </p>
                <p className="mt-1 text-[11px] text-stone-500">
                  evidence: {r.supporting_session_ids.length} session
                  {r.supporting_session_ids.length === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PatternCard({
  pattern,
  sessionLookup,
  participantLabel,
}: {
  pattern: AggregatePattern;
  sessionLookup: Record<string, SessionDoc>;
  participantLabel: string;
}) {
  const typeLabel: Record<AggregatePattern["type"], string> = {
    convergent_problem: "Shared problem",
    divergent_framing: "Divergent framing",
    shared_assumption: "Shared assumption",
    recurring_hedge: "Recurring hedge",
    outlier: "Outlier",
    unasked_across_cohort: "Unasked across cohort",
  };
  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-amber-800">
          {typeLabel[pattern.type]}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-stone-400">
          {pattern.strength} · {pattern.supporting_session_ids.length} session
          {pattern.supporting_session_ids.length === 1 ? "" : "s"}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-900">{pattern.summary}</p>
      {pattern.sample_quotes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {pattern.sample_quotes.slice(0, 3).map((q, i) => (
            <blockquote
              key={i}
              className="border-l-2 border-amber-300 pl-3 text-[12px] italic text-stone-700"
            >
              &ldquo;{q.text}&rdquo;
              <span className="ml-1 text-[10px] not-italic text-stone-400">
                — {sessionLookup[q.session_id]?.note ?? q.session_id.slice(0, 10)} · {participantLabel} · turn {q.turn}
              </span>
            </blockquote>
          ))}
        </div>
      )}
    </li>
  );
}
