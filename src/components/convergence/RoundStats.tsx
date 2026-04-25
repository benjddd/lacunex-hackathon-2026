import type { RoundAggregate } from "@/lib/types";
import { aw } from "./tokens";
import { Mono } from "./Mono";

interface RoundStatsProps {
  aggregate: RoundAggregate;
  totalSessions: number;
  totalDeploys: number;
  totalCandidates: number;
}

function StatBlock({ n, l, thread }: { n: string | number; l: string; thread?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          fontFamily: aw.sans,
          fontSize: 22,
          fontWeight: 600,
          color: thread ? aw.thread : aw.ink,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {n}
      </div>
      <Mono s={9} c={aw.muted2} u>
        {l}
      </Mono>
    </div>
  );
}

export function RoundStats({
  aggregate,
  totalSessions,
  totalDeploys,
  totalCandidates,
}: RoundStatsProps) {
  const outliers = aggregate.patterns.filter((p) => p.type === "outlier").length;
  const unasked = aggregate.patterns.filter(
    (p) => p.type === "unasked_across_cohort"
  ).length;
  const patternsCount = aggregate.patterns.length;

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "flex-end" }}>
      <StatBlock n={totalSessions} l="sessions" />
      <StatBlock n={totalDeploys} l="cross-turn fires" />
      <StatBlock n={totalCandidates} l="candidates" />
      <StatBlock n={patternsCount} l="patterns" />
      {outliers > 0 && <StatBlock n={outliers} l="outliers" thread />}
      {unasked > 0 && <StatBlock n={unasked} l="unasked-across-cohort" thread />}
    </div>
  );
}
