"use client";

import type { AggregatePattern, RoundAggregate } from "@/lib/types";
import { aw } from "./tokens";
import { Mono } from "./Mono";

interface PatternDetailProps {
  pattern: AggregatePattern;
  totalSessions: number;
  routing: RoundAggregate["routing_recommendations"];
  sessionLabels?: Record<string, string>;
}

export function PatternDetail({
  pattern,
  totalSessions,
  routing,
  sessionLabels,
}: PatternDetailProps) {
  const supportingCount = pattern.supporting_session_ids.length;
  const score = pattern.strength === "strong" ? 0.92 : 0.48;

  // Show routing recommendations whose supporting sessions overlap this
  // pattern's supporting sessions. If no overlap, fall back to none — we
  // never show unrelated routing here.
  const patternSessions = new Set(pattern.supporting_session_ids);
  const matched = routing.filter((r) =>
    r.supporting_session_ids.some((sid) => patternSessions.has(sid))
  );

  return (
    <div
      style={{
        borderLeft: `1px solid ${aw.rule}`,
        background: aw.surface,
        padding: "20px 24px",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <Mono u s={10} c={aw.thread}>
          ◆ pattern · {pattern.type.replace(/_/g, " ")}
        </Mono>
        <div
          style={{
            fontFamily: aw.serif,
            fontSize: 24,
            fontWeight: 400,
            marginTop: 4,
            letterSpacing: "-0.01em",
            lineHeight: 1.15,
            color: aw.ink,
          }}
        >
          {firstSentence(pattern.summary)}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: aw.muted,
            marginTop: 6,
            lineHeight: 1.55,
            fontFamily: aw.sans,
          }}
        >
          {restOfSummary(pattern.summary)}
        </div>
      </div>

      <div
        style={{
          padding: "10px 12px",
          border: `1px solid ${aw.rule2}`,
          background: aw.bg,
        }}
      >
        <Mono u s={9} c={aw.muted}>
          signal strength · {Math.round(score * 100)}
        </Mono>
        <div
          style={{
            height: 2,
            background: aw.rule2,
            marginTop: 6,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: `${Math.max(0, 100 - score * 100)}%`,
              background: aw.thread,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <Mono s={9} c={aw.muted2}>
            covers {supportingCount}/{totalSessions} sessions
          </Mono>
          <Mono s={9} c={aw.muted2}>
            kill-rule passed
          </Mono>
        </div>
      </div>

      {pattern.sample_quotes.length > 0 && (
        <div>
          <Mono u s={9} c={aw.muted}>
            verbatim · cited from sessions
          </Mono>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {pattern.sample_quotes.map((q, i) => (
              <div
                key={i}
                style={{
                  paddingLeft: 10,
                  borderLeft: `2px solid ${aw.thread}`,
                }}
              >
                <div
                  style={{
                    fontFamily: aw.serif,
                    fontSize: 14,
                    fontStyle: "italic",
                    color: aw.ink2,
                    lineHeight: 1.4,
                  }}
                >
                  &ldquo;{trim(q.text, 220)}&rdquo;
                </div>
                <Mono s={9} c={aw.thread}>
                  {sessionLabels?.[q.session_id] ?? `#${q.session_id.slice(-2)}`} · t{q.turn}
                </Mono>
              </div>
            ))}
          </div>
        </div>
      )}

      {matched.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            background: aw.threadSoft,
            border: `1px solid ${aw.thread}`,
          }}
        >
          <Mono u s={9} c={aw.thread}>
            routing recommendation
          </Mono>
          <div
            style={{
              fontSize: 11.5,
              color: aw.ink2,
              marginTop: 6,
              lineHeight: 1.55,
              fontFamily: aw.sans,
            }}
          >
            <strong>{matched[0].audience}</strong> — {trim(matched[0].finding, 240)}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 14,
          borderTop: `1px solid ${aw.rule2}`,
        }}
      >
        <Mono s={10} c={aw.muted}>
          {supportingCount} session{supportingCount === 1 ? "" : "s"} cited
        </Mono>
        <Mono s={10} c={aw.thread}>
          {pattern.strength === "strong" ? "strong evidence" : "weak evidence"}
        </Mono>
      </div>
    </div>
  );
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^([^.!?]*[.!?])/);
  if (m) return m[1].trim();
  return s.length > 100 ? s.slice(0, 100) + "…" : s;
}

function restOfSummary(s: string): string {
  if (!s) return "";
  const m = s.match(/^[^.!?]*[.!?]\s*(.*)$/);
  if (m && m[1]) return trim(m[1], 240);
  return "";
}

function trim(s: string, n: number): string {
  if (!s || s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
