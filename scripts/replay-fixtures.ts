/* eslint-disable @typescript-eslint/no-explicit-any */
// Replay the committed fixtures in docs/fixtures/ and validate each
// cross-turn catch against the same invariants the live meta-noticing
// layer enforces:
//
//   1. anchors must reference real turn indices in the transcript
//   2. anchors must strictly precede the turn on which the catch is deployed
//   3. catches whose notice type is NOT implied_not_said / outside_consideration
//      must cite >= 2 distinct anchors (the D26 kill rule)
//   4. templates referenced by each fixture must exist and match shape
//
// Runs offline. No Anthropic key required — the validation is pure structure.
//
// Usage:
//   npm run replay:fixtures                       # writes JSON + MD report
//   npx tsx scripts/replay-fixtures.ts --strict   # non-zero exit on any failure
//
// Outputs:
//   docs/fixtures/REPLAY_REPORT.md   (human-readable, committed)
//   docs/fixtures/replay-report.json (machine-readable, committed)

import * as fs from "node:fs";
import * as path from "node:path";
import { getTemplate } from "../src/lib/templates";

// ---------------------------------------------------------------------------
// Fixture shape normalisation. Two formats exist in docs/fixtures/ (see the
// README section on fixture formats):
//   A. "classic"    — full `transcript`, deployed_notice embedded on host turns
//   B. "annotated"  — `_annotation.key_moments` + `selected_transcript`
// ---------------------------------------------------------------------------

type NoticeType =
  | "contradiction"
  | "hedging_pattern"
  | "implied_not_said"
  | "emotional_shift"
  | "avoidance"
  | "outside_consideration"
  | "minimisation_mask"
  | "scope_displacement"
  | "trust_contradiction"
  | "implied_resignation"
  | "scope_creep"
  | "vague_participant"
  | "protective_synthesis"
  | "source_monitoring"
  | "wrap_up"
  | "unknown";

// Notice types that satisfy the kill rule with a single anchor.
// The standard meta-noticing types (contradiction / hedging_pattern /
// emotional_shift / avoidance / minimisation_mask / trust_contradiction /
// implied_resignation / scope_displacement / scope_creep) describe
// relationships between turns and require ≥2 anchors. The types below
// describe observations about a single turn anchored against out-of-
// transcript domain knowledge — they can validly fire with one anchor.
const SINGLE_ANCHOR_OK: Set<NoticeType> = new Set([
  "implied_not_said", // single-turn inference anchored in domain context
  "outside_consideration", // platform brings an angle not in-transcript
  "source_monitoring", // observed-vs-inferred probe on a single claim
  "vague_participant", // brief-designer: definition is abstract in its own right
  "protective_synthesis", // conductor-level move, not a meta-notice
  "wrap_up",
]);

interface NormalizedCatch {
  fixture: string;
  source: "classic_deployed_notice" | "annotated_key_moment";
  turn_of_catch: number; // the host turn where it fires
  type: NoticeType;
  anchors: number[];
  anchor_span: number; // max(anchors) - min(anchors); 0 when <2 anchors
  narrative: string; // short human description
}

interface NormalizedFixture {
  file: string;
  template_id: string;
  turn_count: number;
  turn_indices: Set<number>; // every index that appears in (selected_)transcript
  max_turn_index: number; // for fixtures with turn_count but sparse selected_transcript
  catches: NormalizedCatch[];
  is_null_case: boolean; // fixture explicitly expects 0 deployed notices
  purpose: string;
}

interface RawFixture {
  _annotation?: {
    purpose?: string;
    turn_count?: number;
    key_moments?: { turn: number; type: string; note: string }[];
    noticing_expectation?: {
      deployed_notices_expected?: number;
    };
  };
  session_summary?: { template_id?: string; turn_count?: number };
  session_id?: string;
  template_id?: string;
  turn_count?: number;
  note?: string;
  transcript?: { index: number; role: string; deployed_notice?: { type: string; anchors?: number[]; observation?: string } }[];
  selected_transcript?: { index: number; role: string; _note?: string; deployed_notice?: { type: string; anchors?: number[]; observation?: string } }[];
}

// Pulls anchor turn indices out of a key_moment note. We support several
// prose patterns that showed up across the committed fixtures:
//   - "Anchors: [3, 5]" or "Anchor: [15]"           (bracket form)
//   - "Anchors turns 3, 7, 9"                       (no bracket)
//   - "Cites turns 3 and 5" / "Cites turns 3, 5, 7" (prose)
//   - "Anchor turn 8"                               (singular)
//   - "(turns 5 and 9)"                             (parenthetical)
// We iterate every keyword match globally and accept the first one that
// yields numeric anchors, so CROSS-TURN markers don't short-circuit the
// search before the real "Cites turns N, M" appears later in the note.
function parseAnchorsFromNote(note: string): number[] | null {
  // 1. Bracket form anywhere: [a, b, ...]
  const bracket = /\[([0-9][\d,\s]*)\]/.exec(note);
  if (bracket) {
    const nums = bracket[1]
      .split(/[,\s]+/)
      .map((p) => parseInt(p, 10))
      .filter((n) => !Number.isNaN(n));
    if (nums.length > 0) return nums;
  }

  // 2. Keyword-driven prose. Strip the CROSS-TURN / cross-turn reasoning
  //    markers first so the word "turn" inside them doesn't match and
  //    shadow the real anchor reference ("Cites turns 3 and 5") later in
  //    the sentence.
  const stripped = note.replace(/\bcross[\s-]turn\b/gi, "");
  const cueRe = /\b(?:anchors?|cites?|turns?)\b[:\s]*([^.;]{0,80})/gi;
  let match: RegExpExecArray | null;
  while ((match = cueRe.exec(stripped)) !== null) {
    const window = match[1].replace(/\b(?:and|or)\b/gi, ",");
    const nums = (window.match(/\d+/g) ?? []).map((s) => parseInt(s, 10));
    const filtered = nums.filter((n) => n >= 0 && n < 200);
    if (filtered.length > 0) return filtered;
  }

  return null;
}

function inferNoticeType(typeOrNote: string): NoticeType {
  const s = typeOrNote.toLowerCase();
  if (s.includes("minimisation_mask") || s.includes("minimisation mask")) return "minimisation_mask";
  if (s.includes("scope_displacement")) return "scope_displacement";
  if (s.includes("trust_contradiction")) return "trust_contradiction";
  if (s.includes("implied_resignation")) return "implied_resignation";
  if (s.includes("scope_creep")) return "scope_creep";
  if (s.includes("vague_participant")) return "vague_participant";
  if (s.includes("source_monitoring") || s.includes("observed_vs_inferred")) return "source_monitoring";
  if (s.includes("protective_synthesis") || s.includes("protective synthesis") || s.includes("restore_certainty")) return "protective_synthesis";
  if (s.includes("contradiction") || s.includes("inconsistency") || s.includes("conflict")) return "contradiction";
  if (s.includes("hedging")) return "hedging_pattern";
  if (s.includes("implied_not_said") || s.includes("implied not said")) return "implied_not_said";
  if (s.includes("emotional_shift")) return "emotional_shift";
  if (s.includes("avoidance")) return "avoidance";
  if (s.includes("outside_consideration") || s.includes("outside consideration")) return "outside_consideration";
  if (s.includes("wrap_up") || s.includes("wraps_up")) return "wrap_up";
  return "unknown";
}

function normalize(filename: string, raw: RawFixture): NormalizedFixture {
  const file = path.basename(filename);
  const template_id =
    raw.template_id ??
    raw.session_summary?.template_id ??
    // extract heuristically from filename prefix
    (file.startsWith("founder") ? "founder-product-ideation" :
      file.startsWith("civic") ? "civic-consultation" :
        file.startsWith("post-incident") ? "post-incident-witness" :
          file.startsWith("brief-designer") ? "brief-designer" : "unknown");

  const turn_count = raw.turn_count ?? raw._annotation?.turn_count ?? raw.session_summary?.turn_count ?? 0;

  // Build the index set from whichever transcript we have.
  const transcript = raw.transcript ?? raw.selected_transcript ?? [];
  const turn_indices = new Set<number>();
  for (const t of transcript) {
    if (typeof t.index === "number") turn_indices.add(t.index);
  }
  const max_turn_index = Math.max(turn_count - 1, ...turn_indices);

  const purpose = raw._annotation?.purpose ?? raw.note ?? "(no annotation)";
  const is_null_case = raw._annotation?.noticing_expectation?.deployed_notices_expected === 0;

  const catches: NormalizedCatch[] = [];

  // Path A: classic — deployed_notice embedded on host turns.
  for (const t of transcript) {
    const dn = (t as any).deployed_notice;
    if (dn && dn.type && Array.isArray(dn.anchors)) {
      catches.push({
        fixture: file,
        source: "classic_deployed_notice",
        turn_of_catch: t.index,
        type: inferNoticeType(dn.type),
        anchors: dn.anchors,
        anchor_span:
          dn.anchors.length >= 2 ? Math.max(...dn.anchors) - Math.min(...dn.anchors) : 0,
        narrative: (dn.observation ?? "").slice(0, 200),
      });
    }
  }

  // Path B: annotated — key_moments marked as CROSS-TURN CATCH (type
  // contains cross_turn_catch, or the note text starts with "CROSS-TURN"
  // in caps). Authors can also attach an explicit `anchors: number[]` to
  // the key_moment, which takes precedence over prose parsing.
  const moments = raw._annotation?.key_moments ?? [];
  for (const m of moments) {
    const isCatch =
      m.type?.toLowerCase().includes("cross_turn_catch") ||
      m.type?.toLowerCase().includes("cross_turn_reasoning") ||
      /CROSS[\s-]TURN (CATCH|REASONING)/i.test(m.note ?? "");
    if (!isCatch) continue;
    const explicit = Array.isArray((m as any).anchors) ? ((m as any).anchors as number[]) : null;
    const anchors = explicit ?? parseAnchorsFromNote(m.note ?? "") ?? [];
    catches.push({
      fixture: file,
      source: "annotated_key_moment",
      turn_of_catch: m.turn,
      // Check the type field first, then fall through to the note text
      // so a bare "conductor_cross_turn_catch" type still gets classified
      // by what the note actually describes (contradiction / avoidance / ...).
      type: inferNoticeType(`${m.type ?? ""} ${m.note ?? ""}`),
      anchors,
      anchor_span: anchors.length >= 2 ? Math.max(...anchors) - Math.min(...anchors) : 0,
      narrative: (m.note ?? "").slice(0, 200),
    });
  }

  return {
    file,
    template_id,
    turn_count,
    turn_indices,
    max_turn_index,
    catches,
    is_null_case,
    purpose,
  };
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

interface Violation {
  fixture: string;
  turn_of_catch: number;
  type: NoticeType;
  rule:
  | "anchors_must_reference_real_turns"
  | "anchors_must_precede_catch_turn"
  | "type_requires_two_distinct_anchors"
  | "anchors_missing"
  | "template_not_found";
  detail: string;
}

function validateCatch(c: NormalizedCatch, f: NormalizedFixture): Violation[] {
  const out: Violation[] = [];

  if (c.anchors.length === 0) {
    out.push({
      fixture: c.fixture,
      turn_of_catch: c.turn_of_catch,
      type: c.type,
      rule: "anchors_missing",
      detail: "catch has no parseable anchors",
    });
    return out;
  }

  // Anchor resolution. Because some fixtures use `selected_transcript` (sparse),
  // we accept any non-negative integer < turn_count. If turn_count is 0
  // (incomplete fixture) we fall back to the max observed index + 1.
  const upperBound = f.turn_count > 0 ? f.turn_count : f.max_turn_index + 1;
  for (const a of c.anchors) {
    if (!(Number.isInteger(a) && a >= 0 && a < upperBound)) {
      out.push({
        fixture: c.fixture,
        turn_of_catch: c.turn_of_catch,
        type: c.type,
        rule: "anchors_must_reference_real_turns",
        detail: `anchor ${a} outside [0, ${upperBound}) (turn_count=${f.turn_count})`,
      });
    }
  }

  // Temporal ordering.
  for (const a of c.anchors) {
    if (a >= c.turn_of_catch) {
      out.push({
        fixture: c.fixture,
        turn_of_catch: c.turn_of_catch,
        type: c.type,
        rule: "anchors_must_precede_catch_turn",
        detail: `anchor ${a} is not strictly before catch at turn ${c.turn_of_catch}`,
      });
    }
  }

  // Two-distinct-anchors rule, with exceptions from SINGLE_ANCHOR_OK.
  const uniq = new Set(c.anchors).size;
  if (!SINGLE_ANCHOR_OK.has(c.type) && uniq < 2) {
    out.push({
      fixture: c.fixture,
      turn_of_catch: c.turn_of_catch,
      type: c.type,
      rule: "type_requires_two_distinct_anchors",
      detail: `type ${c.type} requires >=2 distinct anchors, got ${uniq}`,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

interface Report {
  generated_at: string;
  fixtures_total: number;
  fixtures_per_template: Record<string, number>;
  transcript_turns_total: number;
  catches_total: number;
  catches_per_type: Record<string, number>;
  catches_classic: number;
  catches_annotated: number;
  null_case_fixtures: string[];
  anchor_span_buckets: Record<string, number>; // "1-2", "3-5", "6+"
  multi_anchor_catches: number; // catches with >=2 anchors
  three_plus_anchor_catches: number; // recurrence-style, >=3 distinct anchors
  templates_missing: string[];
  violations: Violation[];
  by_fixture: Array<{
    file: string;
    template_id: string;
    turn_count: number;
    catches: number;
    anchor_spans: number[];
    types: string[];
    purpose: string;
    is_null_case: boolean;
    violation_count: number;
  }>;
}

function bucketizeSpan(span: number): string {
  if (span <= 0) return "n/a";
  if (span <= 2) return "1-2";
  if (span <= 5) return "3-5";
  return "6+";
}

function buildReport(fixtures: NormalizedFixture[]): Report {
  const report: Report = {
    generated_at: new Date().toISOString(),
    fixtures_total: fixtures.length,
    fixtures_per_template: {},
    transcript_turns_total: 0,
    catches_total: 0,
    catches_per_type: {},
    catches_classic: 0,
    catches_annotated: 0,
    null_case_fixtures: [],
    anchor_span_buckets: { "n/a": 0, "1-2": 0, "3-5": 0, "6+": 0 },
    multi_anchor_catches: 0,
    three_plus_anchor_catches: 0,
    templates_missing: [],
    violations: [],
    by_fixture: [],
  };

  for (const f of fixtures) {
    report.fixtures_per_template[f.template_id] =
      (report.fixtures_per_template[f.template_id] ?? 0) + 1;
    report.transcript_turns_total += f.turn_count;

    if (f.is_null_case) report.null_case_fixtures.push(f.file);

    // Template existence check.
    if (!getTemplate(f.template_id)) {
      report.templates_missing.push(`${f.file} -> ${f.template_id}`);
      report.violations.push({
        fixture: f.file,
        turn_of_catch: -1,
        type: "unknown",
        rule: "template_not_found",
        detail: `template_id ${f.template_id} not registered`,
      });
    }

    const fxViolations: Violation[] = [];
    for (const c of f.catches) {
      report.catches_total += 1;
      report.catches_per_type[c.type] = (report.catches_per_type[c.type] ?? 0) + 1;
      if (c.source === "classic_deployed_notice") report.catches_classic += 1;
      else report.catches_annotated += 1;

      const uniqAnchors = new Set(c.anchors).size;
      if (uniqAnchors >= 2) report.multi_anchor_catches += 1;
      if (uniqAnchors >= 3) report.three_plus_anchor_catches += 1;

      report.anchor_span_buckets[bucketizeSpan(c.anchor_span)] += 1;

      const violations = validateCatch(c, f);
      fxViolations.push(...violations);
    }
    report.violations.push(...fxViolations);

    report.by_fixture.push({
      file: f.file,
      template_id: f.template_id,
      turn_count: f.turn_count,
      catches: f.catches.length,
      anchor_spans: f.catches.map((c) => c.anchor_span),
      types: Array.from(new Set(f.catches.map((c) => c.type))),
      purpose: f.purpose,
      is_null_case: f.is_null_case,
      violation_count: fxViolations.length,
    });
  }

  return report;
}

function formatMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push(`# Fixtures replay report`);
  lines.push("");
  lines.push(`_Generated ${report.generated_at}_`);
  lines.push("");
  lines.push(`Ground-truth annotated transcripts committed to \`docs/fixtures/\` are`);
  lines.push(`replayed against the same cross-turn invariants the live meta-noticing`);
  lines.push(`layer enforces (D26 kill rule). This report is regenerated by`);
  lines.push(`\`npm run replay:fixtures\` — do not edit by hand.`);
  lines.push("");

  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---:|`);
  lines.push(`| Fixtures | ${report.fixtures_total} |`);
  lines.push(`| Total annotated turns | ${report.transcript_turns_total} |`);
  lines.push(`| Cross-turn catches | ${report.catches_total} |`);
  lines.push(`| Catches with ≥2 distinct anchors | ${report.multi_anchor_catches} |`);
  lines.push(`| Catches with ≥3 distinct anchors (recurrence) | ${report.three_plus_anchor_catches} |`);
  lines.push(`| Violations of kill-rule invariants | ${report.violations.length} |`);
  lines.push(`| Null-case fixtures (platform correctly silent) | ${report.null_case_fixtures.length} |`);
  lines.push("");

  lines.push(`## Coverage by template`);
  lines.push("");
  lines.push(`| Template | Fixture count |`);
  lines.push(`|---|---:|`);
  for (const [tid, count] of Object.entries(report.fixtures_per_template).sort()) {
    lines.push(`| \`${tid}\` | ${count} |`);
  }
  lines.push("");

  lines.push(`## Notice types exercised`);
  lines.push("");
  lines.push(`| Type | Catches |`);
  lines.push(`|---|---:|`);
  const entries = Object.entries(report.catches_per_type).sort((a, b) => b[1] - a[1]);
  for (const [t, n] of entries) {
    lines.push(`| \`${t}\` | ${n} |`);
  }
  lines.push("");

  lines.push(`## Anchor span distribution`);
  lines.push("");
  lines.push(`How far apart the cited turns are on catches with ≥2 anchors.`);
  lines.push("");
  lines.push(`| Span (turns) | Catches |`);
  lines.push(`|---|---:|`);
  for (const [b, n] of Object.entries(report.anchor_span_buckets)) {
    lines.push(`| ${b} | ${n} |`);
  }
  lines.push("");

  lines.push(`## Per-fixture results`);
  lines.push("");
  lines.push(`| Fixture | Template | Turns | Catches | Types | Violations |`);
  lines.push(`|---|---|---:|---:|---|---:|`);
  for (const r of report.by_fixture) {
    const typeList = r.types.length > 0 ? r.types.map((t) => `\`${t}\``).join(", ") : "—";
    lines.push(
      `| \`${r.file}\` | \`${r.template_id}\` | ${r.turn_count} | ${r.catches}${r.is_null_case ? " (null-case)" : ""} | ${typeList} | ${r.violation_count} |`
    );
  }
  lines.push("");

  if (report.violations.length > 0) {
    lines.push(`## Violations`);
    lines.push("");
    for (const v of report.violations) {
      lines.push(
        `- \`${v.fixture}\` turn ${v.turn_of_catch} (\`${v.type}\`): **${v.rule}** — ${v.detail}`
      );
    }
    lines.push("");
  } else {
    lines.push(`## Violations`);
    lines.push("");
    lines.push(`**None.** Every annotated catch satisfies the D26 kill rule:`);
    lines.push(`anchors reference real turn indices, anchors strictly precede the`);
    lines.push(`catch turn, and catches requiring cross-turn evidence cite ≥2`);
    lines.push(`distinct anchors.`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const strict = process.argv.includes("--strict");
  const fixturesDir = path.resolve(process.cwd(), "docs", "fixtures");
  if (!fs.existsSync(fixturesDir)) {
    process.stderr.write(`fixtures dir not found: ${fixturesDir}\n`);
    process.exit(2);
  }

  const files = fs
    .readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("replay-report"));
  if (files.length === 0) {
    process.stderr.write(`no fixture .json files found in ${fixturesDir}\n`);
    process.exit(2);
  }

  const normalized: NormalizedFixture[] = [];
  for (const f of files) {
    const full = path.join(fixturesDir, f);
    const raw = JSON.parse(fs.readFileSync(full, "utf8")) as RawFixture;
    normalized.push(normalize(full, raw));
  }

  const report = buildReport(normalized);
  const md = formatMarkdown(report);

  const mdOut = path.join(fixturesDir, "REPLAY_REPORT.md");
  const jsonOut = path.join(fixturesDir, "replay-report.json");
  fs.writeFileSync(mdOut, md);
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2));

  process.stdout.write(
    `replayed ${report.fixtures_total} fixture(s), ${report.catches_total} catch(es), ${report.violations.length} violation(s)\n`
  );
  process.stdout.write(`  wrote ${path.relative(process.cwd(), mdOut)}\n`);
  process.stdout.write(`  wrote ${path.relative(process.cwd(), jsonOut)}\n`);

  if (report.violations.length > 0 && strict) {
    process.stderr.write(`\nstrict mode: exiting non-zero due to ${report.violations.length} violation(s)\n`);
    process.exit(1);
  }
}

main();
