// Convergence-map layout. Given a RoundAggregate + the sessions in the round,
// produce node positions, emergent clusters, and the edges between sessions
// that co-anchor patterns.
//
// Approach: spring-like force simulation. Each session is a node. Each
// pattern creates an attractive force between every pair of sessions in
// its supporting set, weighted by strength. All node pairs repel via
// inverse-square. A gentle centering force keeps the cloud in viewBox.
// After convergence, clusters are detected by connected-components on
// "close-enough + share-enough-patterns" pairs, and each cluster's label
// is picked from its most over-represented pattern.

import type { AggregatePattern, RoundAggregate } from "@/lib/types";

export interface NodePosition {
  sessionId: string;
  x: number;
  y: number;
  cluster: string; // emergent cluster id; "outlier" for unclustered singletons
  isOutlier: boolean;
  patternCount: number;
}

export interface ClusterMeta {
  id: string;
  label: string;
  sublabel: string;
  // Centroid is used to anchor labels above the cluster.
  cx: number;
  cy: number;
  // Smoothed convex-hull path (SVG `d`) bounding the cluster's nodes with
  // padding. Empty for outliers — those render as a single open circle.
  haloPath: string;
  // Top of the cluster's halo, used to position the cluster label so it sits
  // just above the visible blob.
  labelY: number;
  isThread: boolean;
  signal: number;
  sessionCount: number;
}

// Edge between two sessions. `weight` is shared-pattern count; `jaccard` is
// the Jaccard similarity of their pattern membership. Renderer uses both:
// stroke width scales with weight, opacity scales with Jaccard.
export interface LayoutEdge {
  aSessionId: string;
  bSessionId: string;
  weight: number;
  jaccard: number;
  // SVG `d` for a subtly-curved path between the two nodes. Non-straight
  // arcs read as relationships, not infrastructure lines.
  path: string;
}

export interface ConvergenceLayout {
  width: number;
  height: number;
  nodes: NodePosition[];
  clusters: ClusterMeta[];
  edges: LayoutEdge[];
}

// Deterministic 32-bit hash. Used to seed the initial circular layout so
// repeated renders are identical.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// ─────────────────────────────────────────────────────────────────────────
// Geometry primitives — convex hull (Andrew's monotone chain), outward
// expansion from centroid, and a Catmull-Rom-ish smoothing pass that turns
// a polygon into a closed bezier path. Used to build the cluster halos.
// ─────────────────────────────────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
}

function cross(O: Point, A: Point, B: Point): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

// Andrew's monotone chain. O(n log n). Returns hull vertices in CCW order.
function convexHull(points: Point[]): Point[] {
  if (points.length < 2) return points.slice();
  const sorted = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Expand each hull vertex outward from the centroid by `padding` pixels.
// Keeps cluster members visually inside the halo.
function expandHull(hull: Point[], centroid: Point, padding: number): Point[] {
  return hull.map((p) => {
    const dx = p.x - centroid.x;
    const dy = p.y - centroid.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) return { x: p.x + padding, y: p.y };
    const k = (d + padding) / d;
    return { x: centroid.x + dx * k, y: centroid.y + dy * k };
  });
}

// Smooth a closed polygon into an SVG path using Catmull-Rom-to-Bezier
// conversion. Each polygon vertex is replaced with a curve through the
// midpoints of its incident edges, with the vertex itself acting as the
// control handle. The result is a soft "blob" outline that hugs the cluster
// without exposing polygonal corners.
function smoothPolygonPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    const r = 24;
    // Single-point cluster: draw a circle as path.
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y} Z`;
  }
  if (points.length === 2) {
    // Two-point cluster: draw a capsule (rounded rectangle).
    const [a, b] = points;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const r = 30;
    const ux = -dy / d;
    const uy = dx / d;
    const a1 = { x: a.x + ux * r, y: a.y + uy * r };
    const a2 = { x: a.x - ux * r, y: a.y - uy * r };
    const b1 = { x: b.x + ux * r, y: b.y + uy * r };
    const b2 = { x: b.x - ux * r, y: b.y - uy * r };
    return `M ${a1.x} ${a1.y} L ${b1.x} ${b1.y} A ${r} ${r} 0 0 1 ${b2.x} ${b2.y} L ${a2.x} ${a2.y} A ${r} ${r} 0 0 1 ${a1.x} ${a1.y} Z`;
  }

  const pts = points;
  const n = pts.length;
  const seg = (i: number) => pts[(i + n) % n];

  // Compute midpoints of edges; smooth path passes through midpoints with
  // each vertex acting as the quadratic control point.
  const mids: Point[] = pts.map((_, i) => {
    const a = seg(i);
    const b = seg(i + 1);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  });

  let d = `M ${mids[0].x} ${mids[0].y}`;
  for (let i = 0; i < n; i++) {
    const ctrl = seg(i + 1);
    const end = mids[(i + 1) % n];
    d += ` Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
  }
  d += " Z";
  return d;
}

// Bounding-box max-Y for a path of points (used to anchor labels just above
// the cluster). Cheap — uses original positions, not the smoothed curve.
function topOfPoints(points: Point[]): number {
  let top = Infinity;
  for (const p of points) if (p.y < top) top = p.y;
  return top;
}

// Build the SVG path for one curved edge between two nodes. Quadratic
// Bezier with the control point offset perpendicular to the direct line by
// a small fraction of distance — produces a gentle bow. The curve direction
// alternates by node-pair hash so adjacent edges don't all bow the same way.
function curvedEdgePath(a: Point, b: Point, seed: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.5) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  // Perpendicular offset, scaled with distance. Direction alternates from seed.
  const sign = seed % 2 === 0 ? 1 : -1;
  const offset = Math.min(dist * 0.08, 18) * sign;
  const cx = mx + (-dy / dist) * offset;
  const cy = my + (dx / dist) * offset;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

interface BuildArgs {
  aggregate: RoundAggregate;
  sessionIds: string[];
  width: number;
  height: number;
}

interface Vec {
  x: number;
  y: number;
}

// Tunables. Calibrated by eye on cohorts of 5–30 nodes; if you scale far
// beyond that you may want to increase iterations.
const ITERATIONS = 320;
const REPULSION = 6500; // 1/r² scaling — high enough to keep nodes legible
const ATTRACTION = 0.0028; // per shared-pattern-strength, per iteration
const CENTERING = 0.012; // pull every node weakly toward viewBox centre
const DAMPING = 0.82;
const MIN_DIST = 16; // hard floor so labels don't collide
const COOLING_END = 0.18; // step size at the last iteration as fraction of start

export function buildLayout({
  aggregate,
  sessionIds,
  width,
  height,
}: BuildArgs): ConvergenceLayout {
  // Step 1 — invert pattern → session memberships.
  // Each session ends up with a list of {patternIdx, strength}.
  const sessionPatterns = new Map<string, Array<{ idx: number; strength: number; type: string }>>();
  for (const sid of sessionIds) sessionPatterns.set(sid, []);

  aggregate.patterns.forEach((p, idx) => {
    const strength = p.strength === "strong" ? 1 : 0.5;
    for (const sid of p.supporting_session_ids) {
      const cur = sessionPatterns.get(sid);
      if (cur) cur.push({ idx, strength, type: p.type });
    }
  });

  // Step 2 — pairwise attraction weights (sum of shared pattern strengths).
  const n = sessionIds.length;
  const attract: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const a = sessionPatterns.get(sessionIds[i]) ?? [];
    if (a.length === 0) continue;
    const aIdx = new Map<number, number>();
    for (const m of a) aIdx.set(m.idx, m.strength);
    for (let j = i + 1; j < n; j++) {
      const b = sessionPatterns.get(sessionIds[j]) ?? [];
      let w = 0;
      for (const m of b) {
        const s = aIdx.get(m.idx);
        if (s !== undefined) w += s + m.strength * 0.5;
      }
      attract[i][j] = w;
      attract[j][i] = w;
    }
  }

  // Step 3 — initialise positions on a circle; deterministic order from hash.
  const cx = width / 2;
  const cy = height / 2;
  const r0 = Math.min(width, height) * 0.32;
  const positions: Vec[] = sessionIds.map((sid, i) => {
    const seed = hash(sid);
    const angle = (i / n) * Math.PI * 2 + (seed % 100) / 200;
    return { x: cx + Math.cos(angle) * r0, y: cy + Math.sin(angle) * r0 };
  });
  const velocities: Vec[] = sessionIds.map(() => ({ x: 0, y: 0 }));

  // Step 4 — force simulation.
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const cool = 1 - (1 - COOLING_END) * (iter / ITERATIONS);
    const fx = new Array(n).fill(0);
    const fy = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      // Centering pull
      fx[i] += (cx - positions[i].x) * CENTERING;
      fy[i] += (cy - positions[i].y) * CENTERING;

      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);

        // Repulsion (Coulomb-ish; falls off with 1/r²)
        const rep = REPULSION / distSq;
        const ux = dx / dist;
        const uy = dy / dist;
        fx[i] -= ux * rep;
        fy[i] -= uy * rep;
        fx[j] += ux * rep;
        fy[j] += uy * rep;

        // Attraction (Hooke-ish; pulls strongly when far, weakens when close)
        const w = attract[i][j];
        if (w > 0) {
          const pull = w * ATTRACTION * dist;
          fx[i] += ux * pull;
          fy[i] += uy * pull;
          fx[j] -= ux * pull;
          fy[j] -= uy * pull;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      velocities[i].x = (velocities[i].x + fx[i]) * DAMPING;
      velocities[i].y = (velocities[i].y + fy[i]) * DAMPING;
      positions[i].x += velocities[i].x * cool;
      positions[i].y += velocities[i].y * cool;
    }
  }

  // Step 5 — clamp into viewBox with a margin so labels don't clip.
  const margin = 60;
  for (const p of positions) {
    p.x = Math.max(margin, Math.min(width - margin, p.x));
    p.y = Math.max(margin, Math.min(height - margin, p.y));
  }

  // Step 6 — minimum-distance enforcement: if two nodes are within MIN_DIST,
  // push them apart in one cleanup pass. Avoids the worst label collisions.
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MIN_DIST && d > 0.001) {
          const push = (MIN_DIST - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          positions[i].x -= ux * push;
          positions[i].y -= uy * push;
          positions[j].x += ux * push;
          positions[j].y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Step 7 — detect emergent clusters.
  // Edge in the "close-and-shared" graph if positions are close AND the pair
  // shares ≥1 pattern. Connected components become clusters; singletons are
  // outliers.
  const CLUSTER_DIST = Math.min(width, height) * 0.18;
  const parent = sessionIds.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = positions[j].x - positions[i].x;
      const dy = positions[j].y - positions[i].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < CLUSTER_DIST && attract[i][j] >= 1.0) {
        union(i, j);
      }
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }

  // Step 8 — assemble nodes + cluster meta.
  // Cluster id naming: "c0", "c1", … sorted by cluster size descending. Any
  // singleton becomes its own outlier cluster.
  const groupArrays = Array.from(groups.values()).sort((a, b) => b.length - a.length);
  const nodes: NodePosition[] = sessionIds.map((sid) => ({
    sessionId: sid,
    x: 0,
    y: 0,
    cluster: "outlier",
    isOutlier: false,
    patternCount: 0,
  }));

  const clusters: ClusterMeta[] = [];
  groupArrays.forEach((indices, gi) => {
    const isOutlier = indices.length === 1;
    const cid = isOutlier ? `outlier-${gi}` : `c${gi}`;

    // Find the pattern most concentrated in this group: weight by
    // (in-cluster coverage) × (strength bonus) × log(cluster representation).
    // The label that "names" the cluster is the pattern that explains the
    // most of its membership.
    const memberSids = indices.map((i) => sessionIds[i]);
    const memberSet = new Set(memberSids);
    let bestPattern: AggregatePattern | null = null;
    let bestScore = 0;
    let bestType = "";

    for (const p of aggregate.patterns) {
      let inside = 0;
      for (const sid of p.supporting_session_ids) {
        if (memberSet.has(sid)) inside += 1;
      }
      if (inside === 0) continue;
      const strengthMult = p.strength === "strong" ? 1.0 : 0.6;
      const coverage = inside / Math.max(memberSids.length, 1);
      const score = coverage * strengthMult * (1 + Math.log2(inside + 1));
      if (score > bestScore) {
        bestScore = score;
        bestPattern = p;
        bestType = p.type;
      }
    }

    const isThreadCluster =
      isOutlier ||
      bestType === "outlier" ||
      bestType === "unasked_across_cohort";

    // Convex-hull halo: take the cluster's positions, hull them, expand
    // outward from centroid by padding, smooth into a closed Bezier path.
    const memberPoints: Point[] = indices.map((idx) => ({
      x: positions[idx].x,
      y: positions[idx].y,
    }));
    const ccx = memberPoints.reduce((s, p) => s + p.x, 0) / memberPoints.length;
    const ccy = memberPoints.reduce((s, p) => s + p.y, 0) / memberPoints.length;
    const hull = convexHull(memberPoints);
    const padding = isOutlier ? 0 : 38;
    const expanded = isOutlier ? [] : expandHull(hull, { x: ccx, y: ccy }, padding);
    const haloPath = isOutlier ? "" : smoothPolygonPath(expanded);

    // Average attractive weight in-cluster, mapped to a 0–99 signal score.
    let strength = 0;
    let n2 = 0;
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        strength += attract[indices[i]][indices[j]];
        n2 += 1;
      }
    }
    const signal =
      n2 > 0
        ? Math.min(99, Math.round((strength / n2) * 30))
        : Math.round(bestScore * 100);

    const haloTop = expanded.length > 0 ? topOfPoints(expanded) : ccy;

    clusters.push({
      id: cid,
      label: bestPattern
        ? trim(firstSentence(bestPattern.summary), 60)
        : isOutlier
          ? "Single-source pattern"
          : "—",
      sublabel: isOutlier
        ? "single-source pattern"
        : `n=${indices.length} · signal ${signal}`,
      cx: ccx,
      cy: ccy,
      haloPath,
      labelY: haloTop - 12,
      isThread: isThreadCluster,
      signal,
      sessionCount: indices.length,
    });

    for (const idx of indices) {
      nodes[idx].x = positions[idx].x;
      nodes[idx].y = positions[idx].y;
      nodes[idx].cluster = cid;
      nodes[idx].isOutlier = isOutlier;
      nodes[idx].patternCount = (sessionPatterns.get(sessionIds[idx]) ?? []).length;
    }
  });

  // Edges: pairs sharing ≥2 patterns. Each edge gets a raw weight (shared
  // count) AND a Jaccard score (shared / union). The renderer uses both.
  // We then keep only the top-K edges per node so the canvas reads as
  // structure, not a hairball.
  const TOP_K_PER_NODE = 4;
  const allEdges: Array<LayoutEdge & { aIdx: number; bIdx: number }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = sessionPatterns.get(sessionIds[i]) ?? [];
      const b = sessionPatterns.get(sessionIds[j]) ?? [];
      if (a.length === 0 || b.length === 0) continue;
      const aIdx = new Set(a.map((m) => m.idx));
      const bIdx = new Set(b.map((m) => m.idx));
      let overlap = 0;
      for (const m of b) if (aIdx.has(m.idx)) overlap += 1;
      if (overlap < 2) continue;
      const union = new Set<number>();
      aIdx.forEach((v) => union.add(v));
      bIdx.forEach((v) => union.add(v));
      const jaccard = union.size > 0 ? overlap / union.size : 0;
      const seed =
        hash(sessionIds[i] + sessionIds[j]) % 9973;
      const path = curvedEdgePath(positions[i], positions[j], seed);
      allEdges.push({
        aSessionId: sessionIds[i],
        bSessionId: sessionIds[j],
        aIdx: i,
        bIdx: j,
        weight: overlap,
        jaccard,
        path,
      });
    }
  }

  // Sort by combined score and keep top-K per node. An edge survives if at
  // least one of its endpoints still has slots left in its top-K list.
  allEdges.sort((x, y) => y.weight + y.jaccard - (x.weight + x.jaccard));
  const remainingSlots = new Array(n).fill(TOP_K_PER_NODE);
  const edges: LayoutEdge[] = [];
  for (const e of allEdges) {
    if (remainingSlots[e.aIdx] > 0 || remainingSlots[e.bIdx] > 0) {
      edges.push({
        aSessionId: e.aSessionId,
        bSessionId: e.bSessionId,
        weight: e.weight,
        jaccard: e.jaccard,
        path: e.path,
      });
      remainingSlots[e.aIdx] -= 1;
      remainingSlots[e.bIdx] -= 1;
    }
  }

  return { width, height, nodes, clusters, edges };
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^([^.!?]*[.!?])/);
  return m ? m[1].trim() : s;
}

function trim(s: string, max: number): string {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

// Pick a "selected" session id for first render: the session that
// participates in the most strong patterns. Used by the page to decide
// which node gets the active highlight + arc bundle.
export function pickRepresentativeSession(
  aggregate: RoundAggregate,
  sessionIds: string[]
): string | null {
  if (sessionIds.length === 0) return null;
  const counts = new Map<string, number>();
  for (const sid of sessionIds) counts.set(sid, 0);
  for (const p of aggregate.patterns) {
    if (p.strength !== "strong") continue;
    for (const sid of p.supporting_session_ids) {
      counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
  }
  let best = sessionIds[0];
  let bestN = -1;
  for (const [sid, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = sid;
    }
  }
  return best;
}
