"use client";

import { useMemo } from "react";
import type { RoundAggregate } from "@/lib/types";
import { aw } from "./tokens";
import { buildLayout } from "./layout";

interface ConvergenceMapProps {
  aggregate: RoundAggregate;
  sessionIds: string[];
  // The id of the session whose anchor arcs we draw bright. Other arcs render
  // muted in the background.
  selectedSessionId?: string | null;
  // Optional shorthand label per session (e.g. "#04"). If omitted we derive
  // a 2-char tag from the session id's tail.
  sessionLabels?: Record<string, string>;
  // Optional set of session ids to brighten — used when a pattern is
  // selected on the left rail to highlight that pattern's supporters.
  highlightedSessionIds?: Set<string>;
}

function makeLabel(sessionId: string, labels?: Record<string, string>): string {
  if (labels?.[sessionId]) return labels[sessionId];
  return `#${sessionId.slice(-2)}`;
}

export function ConvergenceMap({
  aggregate,
  sessionIds,
  selectedSessionId,
  sessionLabels,
  highlightedSessionIds,
}: ConvergenceMapProps) {
  const W = 880;
  const H = 600;

  const layout = useMemo(
    () => buildLayout({ aggregate, sessionIds, width: W, height: H }),
    [aggregate, sessionIds]
  );

  const nodeBySession = useMemo(() => {
    const m = new Map<string, (typeof layout.nodes)[number]>();
    for (const n of layout.nodes) m.set(n.sessionId, n);
    return m;
  }, [layout]);

  const activeNode = selectedSessionId ? nodeBySession.get(selectedSessionId) : null;

  // Edges incident to the active node — these get drawn bright (thread color)
  // on top of the muted background edges to show the active node's strongest
  // co-anchored peers.
  const incidentEdges = useMemo(() => {
    if (!selectedSessionId) return new Set<number>();
    const set = new Set<number>();
    layout.edges.forEach((e, i) => {
      if (e.aSessionId === selectedSessionId || e.bSessionId === selectedSessionId) {
        set.add(i);
      }
    });
    return set;
  }, [layout.edges, selectedSessionId]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* A barely-perceptible blur softens the halo edges so the cluster
            reads as a region of focus, not a hard polygon. */}
        <filter id="cm-halo-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Cluster halos: smoothed convex hulls, blurred. Thread-colored for
          outliers / unasked-across-cohort clusters; soft panel otherwise. */}
      {layout.clusters.map((cl) =>
        cl.haloPath ? (
          <path
            key={`halo-${cl.id}`}
            d={cl.haloPath}
            fill={cl.isThread ? aw.threadSoft : aw.panel}
            opacity={cl.isThread ? 0.55 : 0.65}
            filter="url(#cm-halo-soft)"
          />
        ) : null
      )}

      {/* Cluster labels — sit above the halo's top edge. Outliers get a
          right-aligned label since they often hug the right edge. */}
      {layout.clusters.map((cl) => {
        const isOutlier = cl.id.startsWith("outlier-");
        const anchor = isOutlier ? "end" : "middle";
        const tx = isOutlier ? Math.min(cl.cx + 36, W - 16) : cl.cx;
        return (
          <g key={`label-${cl.id}`}>
            <text
              x={tx}
              y={cl.labelY}
              fontSize="12"
              fontFamily={aw.serif}
              fill={cl.isThread ? aw.thread : aw.ink}
              textAnchor={anchor}
              fontStyle="italic"
            >
              {cl.label}
            </text>
            <text
              x={tx}
              y={cl.labelY + 14}
              fontSize="9"
              fontFamily={aw.mono}
              fill={cl.isThread ? aw.thread : aw.muted}
              textAnchor={anchor}
            >
              {cl.sublabel}
            </text>
          </g>
        );
      })}

      {/* Background edges — curved, opacity from Jaccard, width from weight.
          Edges incident to the active node render in a second pass so they
          stack on top. */}
      {layout.edges.map((e, i) => {
        if (incidentEdges.has(i)) return null;
        const opacity = 0.16 + Math.min(e.jaccard, 0.6) * 0.5;
        const width = Math.min(0.55 + e.weight * 0.18, 1.4);
        return (
          <path
            key={`bg-${i}`}
            d={e.path}
            fill="none"
            stroke={aw.muted2}
            strokeOpacity={opacity}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}

      {/* Active node anchor arcs — drawn after background so they sit on top */}
      {activeNode &&
        layout.edges.map((e, i) => {
          if (!incidentEdges.has(i)) return null;
          const opacity = 0.7 + Math.min(e.jaccard, 0.5) * 0.6;
          const width = Math.min(0.9 + e.weight * 0.22, 1.8);
          return (
            <path
              key={`arc-${i}`}
              d={e.path}
              fill="none"
              stroke={aw.thread}
              strokeOpacity={Math.min(opacity, 1)}
              strokeWidth={width}
              strokeLinecap="round"
            />
          );
        })}

      {/* Nodes */}
      {layout.nodes.map((n) => {
        const isActive = n.sessionId === selectedSessionId;
        const isHighlighted = highlightedSessionIds?.has(n.sessionId) ?? false;
        const radius = isActive ? 7 : n.isOutlier ? 5 : 4;
        const fill = isActive
          ? aw.thread
          : n.isOutlier
            ? "transparent"
            : isHighlighted
              ? aw.thread
              : aw.ink;
        return (
          <g key={n.sessionId}>
            {isActive && (
              <>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="20"
                  fill="none"
                  stroke={aw.thread}
                  strokeWidth="0.8"
                  opacity="0.45"
                />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="13"
                  fill="none"
                  stroke={aw.thread}
                  strokeWidth="1"
                />
              </>
            )}
            <a
              href={`/sessions/${n.sessionId}`}
              aria-label={`open session ${makeLabel(n.sessionId, sessionLabels)}`}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={fill}
                stroke={n.isOutlier ? aw.thread : "transparent"}
                strokeWidth={n.isOutlier ? 1.5 : 0}
                style={{ cursor: "pointer" }}
              />
              {n.isOutlier && (
                <circle cx={n.x} cy={n.y} r="2.5" fill={aw.thread} />
              )}
              <text
                x={n.x + 10}
                y={n.y + 4}
                fontSize="9"
                fontFamily={aw.mono}
                fill={isActive || isHighlighted ? aw.thread : aw.muted}
                fontWeight={isActive ? 600 : 400}
                style={{ pointerEvents: "none" }}
              >
                {makeLabel(n.sessionId, sessionLabels)}
              </text>
            </a>
          </g>
        );
      })}
    </svg>
  );
}
