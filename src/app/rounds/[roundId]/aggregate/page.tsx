"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ExtractionState, Round, Turn } from "@/lib/types";
import { ConvergenceMap } from "@/components/convergence/ConvergenceMap";
import { PatternList } from "@/components/convergence/PatternList";
import { PatternDetail } from "@/components/convergence/PatternDetail";
import { RoundStats } from "@/components/convergence/RoundStats";
import { Mono } from "@/components/convergence/Mono";
import { aw } from "@/components/convergence/tokens";
import { pickRepresentativeSession } from "@/components/convergence/layout";

interface SessionDoc {
  session_id: string;
  saved_at: string;
  template_id: string;
  note: string | null;
  turn_count: number;
  transcript: Turn[];
  extraction: ExtractionState;
}

export default function AggregateHeroPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = use(params);
  const [round, setRound] = useState<Round | null>(null);
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aggregating, setAggregating] = useState(false);
  const [selectedPatternIdx, setSelectedPatternIdx] = useState(0);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleAggregate = useCallback(async () => {
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
  }, [aggregating, roundId]);

  const aggregate = round?.aggregate ?? round?.live_synthesis ?? null;
  const sessionIds = useMemo(
    () => round?.session_ids ?? sessions.map((s) => s.session_id),
    [round, sessions]
  );

  const sessionLabels = useMemo(() => {
    // Numbered short labels: "#01", "#02", … in the order sessions joined
    // the round.
    const m: Record<string, string> = {};
    sessionIds.forEach((sid, i) => {
      m[sid] = `#${String(i + 1).padStart(2, "0")}`;
    });
    return m;
  }, [sessionIds]);

  const totalDeploys = useMemo(() => {
    let n = 0;
    for (const s of sessions) {
      for (const t of s.transcript) {
        if ((t as Turn & { deployed_notice?: unknown }).deployed_notice) n += 1;
      }
    }
    return n;
  }, [sessions]);

  const totalCandidates = useMemo(() => {
    let n = 0;
    for (const s of sessions) {
      for (const t of s.transcript) {
        const cands = (t as Turn & { notice_candidates?: unknown[] }).notice_candidates;
        if (Array.isArray(cands)) n += cands.length;
      }
    }
    return n;
  }, [sessions]);

  const selectedSessionId = useMemo(() => {
    if (!aggregate) return null;
    return pickRepresentativeSession(aggregate, sessionIds);
  }, [aggregate, sessionIds]);

  const selectedPattern = aggregate?.patterns[selectedPatternIdx] ?? null;

  // Sessions to highlight in the map when a pattern is selected on the
  // left rail — they're the supporting sessions of that pattern.
  const highlightedSessionIds = useMemo(() => {
    if (!selectedPattern) return new Set<string>();
    return new Set(selectedPattern.supporting_session_ids);
  }, [selectedPattern]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: aw.bg,
        fontFamily: aw.sans,
        color: aw.ink,
        display: "grid",
        gridTemplateRows: "auto auto 1fr auto",
      }}
    >
      {/* Top chrome — wordmark + breadcrumb */}
      <div
        style={{
          padding: "14px 36px",
          borderBottom: `1px solid ${aw.rule}`,
          background: aw.surface,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link
            href="/"
            style={{
              fontFamily: aw.sans,
              fontWeight: 500,
              fontSize: 18,
              letterSpacing: "-0.02em",
              color: aw.ink,
              textDecoration: "none",
            }}
          >
            lacunex
          </Link>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/rounds" style={{ textDecoration: "none" }}>
              <Mono s={11} c={aw.muted}>
                rounds
              </Mono>
            </Link>
            <Mono s={11} c={aw.muted2}>
              /
            </Mono>
            <Link href={`/rounds/${roundId}`} style={{ textDecoration: "none" }}>
              <Mono s={11} c={aw.muted}>
                {trim(roundId, 16)}
              </Mono>
            </Link>
            <Mono s={11} c={aw.muted2}>
              /
            </Mono>
            <Mono s={11} c={aw.ink}>
              aggregate
            </Mono>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Mono s={11} c={aw.muted}>
            {round ? (round.status === "closed" ? "round closed" : "round open") : "loading"}
          </Mono>
        </div>
      </div>

      {/* Header — round meta */}
      <div
        style={{
          padding: "24px 36px 18px",
          background: aw.surface,
          borderBottom: `1px solid ${aw.rule}`,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
        }}
      >
        <div>
          <Mono u s={10} c={aggregate ? aw.thread : aw.muted}>
            {aggregate
              ? `${aggregate.session_count} sessions · updated ${formatRelative(aggregate.generated_at)}`
              : "no aggregate yet"}
          </Mono>
          <div
            style={{
              fontFamily: aw.serif,
              fontSize: 36,
              fontWeight: 400,
              marginTop: 6,
              letterSpacing: "-0.015em",
              lineHeight: 1.05,
              color: aw.ink,
            }}
          >
            {round?.label ?? "—"}
          </div>
          {aggregate && (
            <div
              style={{
                fontSize: 13.5,
                color: aw.muted,
                marginTop: 8,
                lineHeight: 1.55,
                maxWidth: 760,
              }}
            >
              {trim(aggregate.summary, 360)}
            </div>
          )}
        </div>
        {aggregate && (
          <RoundStats
            aggregate={aggregate}
            totalSessions={sessionIds.length}
            totalDeploys={totalDeploys}
            totalCandidates={totalCandidates}
          />
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "8px 36px",
            background: aw.threadSoft,
            color: aw.thread,
            fontSize: 12,
            fontFamily: aw.mono,
            borderBottom: `1px solid ${aw.thread}`,
          }}
        >
          {error}
        </div>
      )}

      {/* BODY — left rail · centre map · right rail */}
      {aggregate && selectedPattern ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr 380px",
            overflow: "hidden",
            minHeight: 600,
          }}
        >
          <PatternList
            patterns={aggregate.patterns}
            selectedIndex={selectedPatternIdx}
            onSelect={setSelectedPatternIdx}
          />

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: aw.bg,
            }}
          >
            <div style={{ position: "absolute", top: 18, left: 24, zIndex: 3 }}>
              <Mono u s={10} c={aw.muted}>
                convergence map
              </Mono>
              <div
                style={{
                  fontFamily: aw.serif,
                  fontSize: 24,
                  fontWeight: 400,
                  marginTop: 2,
                  letterSpacing: "-0.01em",
                  color: aw.ink,
                }}
              >
                {sessionIds.length} sessions, drawn by what they share
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: aw.muted,
                  marginTop: 4,
                  lineHeight: 1.5,
                  maxWidth: 380,
                }}
              >
                Each node is a participant. Each arc is a shared anchor
                pattern. Click a node to dive into the session.
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 18,
                left: 24,
                zIndex: 3,
                display: "flex",
                gap: 14,
                fontFamily: aw.mono,
                fontSize: 9,
                color: aw.muted,
                alignItems: "center",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, background: aw.ink, borderRadius: "50%" }} />
                session
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, background: aw.thread, borderRadius: "50%" }} />
                most-anchored
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    border: `1px solid ${aw.thread}`,
                    borderRadius: "50%",
                  }}
                />
                outlier
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 1, background: aw.muted2 }} />
                shared anchor
              </span>
            </div>
            <div
              style={{
                position: "absolute",
                top: 14,
                right: 24,
                zIndex: 3,
                display: "flex",
                gap: 6,
              }}
            >
              {(["by pattern"] as const).map((v, i) => (
                <button
                  key={i}
                  type="button"
                  style={{
                    fontFamily: aw.mono,
                    fontSize: 10,
                    padding: "4px 10px",
                    background: i === 0 ? aw.ink : aw.surface,
                    color: i === 0 ? aw.surface : aw.muted,
                    border: `1px solid ${i === 0 ? aw.ink : aw.rule}`,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "default",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <ConvergenceMap
              aggregate={aggregate}
              sessionIds={sessionIds}
              selectedSessionId={selectedSessionId}
              sessionLabels={sessionLabels}
              highlightedSessionIds={highlightedSessionIds}
            />
          </div>

          <PatternDetail
            pattern={selectedPattern}
            totalSessions={sessionIds.length}
            routing={aggregate.routing_recommendations}
            sessionLabels={sessionLabels}
          />
        </div>
      ) : (
        <div
          style={{
            padding: "60px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 14,
            maxWidth: 720,
          }}
        >
          {round && round.session_ids.length === 0 ? (
            <Mono s={12} c={aw.muted}>
              No sessions yet. Attach sessions to the round, then generate the aggregate.
            </Mono>
          ) : (
            <>
              <Mono u s={10} c={aw.muted}>
                no aggregate yet
              </Mono>
              <div
                style={{
                  fontFamily: aw.serif,
                  fontSize: 28,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                Synthesise the round.
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: aw.muted,
                  lineHeight: 1.6,
                  fontFamily: aw.sans,
                  maxWidth: 540,
                }}
              >
                Runs Opus 4.7 across all {round?.session_ids.length ?? 0} session
                {round?.session_ids.length === 1 ? "" : "s"} and produces 6 pattern
                types (convergent, divergent, shared assumption, recurring hedge,
                outlier, unasked-across-cohort) with verbatim quote provenance and
                routing recommendations.
              </div>
              <button
                type="button"
                onClick={() => void handleAggregate()}
                disabled={aggregating || (round?.session_ids.length ?? 0) === 0}
                style={{
                  fontFamily: aw.mono,
                  fontSize: 11,
                  padding: "10px 16px",
                  background: aw.ink,
                  color: aw.surface,
                  border: "none",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: aggregating ? "wait" : "pointer",
                  opacity: aggregating || (round?.session_ids.length ?? 0) === 0 ? 0.4 : 1,
                }}
              >
                {aggregating ? "synthesising · 30–90s" : "generate aggregate"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom synthesis bar — cohort one-liner */}
      {aggregate && (
        <div
          style={{
            padding: "14px 36px",
            borderTop: `1px solid ${aw.rule}`,
            background: aw.panel,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
            <Mono u s={9} c={aw.muted}>
              cohort synthesis
            </Mono>
            <div
              style={{
                fontSize: 12,
                color: aw.ink2,
                lineHeight: 1.5,
                maxWidth: 720,
                fontFamily: aw.sans,
              }}
            >
              {firstSentence(aggregate.summary)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => void handleAggregate()}
              disabled={aggregating}
              style={{
                fontFamily: aw.mono,
                fontSize: 10,
                padding: "7px 12px",
                background: aw.surface,
                color: aw.ink,
                border: `1px solid ${aw.rule}`,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: aggregating ? "wait" : "pointer",
              }}
            >
              {aggregating ? "regenerating…" : "re-run synthesis"}
            </button>
            <Link
              href={`/rounds/${roundId}`}
              style={{
                fontFamily: aw.mono,
                fontSize: 10,
                padding: "7px 12px",
                background: aw.surface,
                color: aw.ink,
                border: `1px solid ${aw.rule}`,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              round detail →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function trim(s: string, n: number): string {
  if (!s || s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^([^.!?]*[.!?])/);
  return m ? m[1].trim() : trim(s, 200);
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  return d.toLocaleDateString();
}
