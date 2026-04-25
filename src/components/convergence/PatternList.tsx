"use client";

import type { AggregatePattern } from "@/lib/types";
import { aw } from "./tokens";
import { Mono } from "./Mono";

interface PatternListProps {
  patterns: AggregatePattern[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function PatternList({ patterns, selectedIndex, onSelect }: PatternListProps) {
  // Stable strength-to-numeric so we can sort + render the bar.
  const ranked = patterns
    .map((p, idx) => ({ p, idx, score: scoreFor(p) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div
      style={{
        borderRight: `1px solid ${aw.rule}`,
        background: aw.surface,
        padding: "18px 24px",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <Mono u s={10} c={aw.muted}>
        {patterns.length} patterns · ranked by signal strength
      </Mono>
      {ranked.map(({ p, idx, score }) => {
        const isActive = idx === selectedIndex;
        const isThreaded = p.type === "outlier" || p.type === "unasked_across_cohort";
        const borderColor = isActive ? aw.thread : isThreaded ? aw.thread : aw.rule2;
        const leftBorder = isActive || isThreaded ? aw.thread : aw.muted2;
        return (
          <button
            key={idx}
            onClick={() => onSelect(idx)}
            type="button"
            style={{
              padding: "10px 12px",
              background: isActive ? aw.threadSoft : aw.surface,
              border: `1px solid ${borderColor}`,
              borderLeft: `3px solid ${leftBorder}`,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: aw.sans,
              color: aw.ink,
              transition: "background 100ms ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Mono s={9} c={isActive || isThreaded ? aw.thread : aw.muted} u>
                ◆ {p.type.replace(/_/g, " ")}
              </Mono>
              <Mono s={9} c={aw.muted2}>
                {Math.round(score * 100)}
              </Mono>
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                marginTop: 5,
                lineHeight: 1.3,
                color: aw.ink,
              }}
            >
              {trim(p.summary, 70)}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
              }}
            >
              <div
                style={{
                  height: 2,
                  flex: 1,
                  background: aw.rule2,
                  marginRight: 8,
                }}
              >
                <div
                  style={{
                    height: 2,
                    width: `${Math.round(score * 100)}%`,
                    background: isActive || isThreaded ? aw.thread : aw.ink,
                  }}
                />
              </div>
              <Mono s={9} c={aw.muted2}>
                n={p.supporting_session_ids.length}
              </Mono>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Score: combine strength enum + supporting_session_ids count.
// Strong + many supporting sessions = high. The pattern API exposes
// `strong | weak`; we use 0.85 / 0.45 as base, then add a coverage bonus
// scaled to session count.
function scoreFor(p: AggregatePattern): number {
  const base = p.strength === "strong" ? 0.65 : 0.32;
  const coverage = Math.min(p.supporting_session_ids.length / 12, 1) * 0.35;
  return Math.min(0.99, base + coverage);
}

function trim(s: string, n: number): string {
  if (!s || s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
