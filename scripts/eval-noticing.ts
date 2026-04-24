// Dev script: evaluate the meta-noticing layer against saved session files.
// Standalone — imports the lib directly (no HTTP hop), so the Next.js dev
// server does NOT need to be running.
//
// Usage:
//   npx tsx scripts/eval-noticing.ts --session=session-2026-04-23T08-09-02-211Z.json
//   npx tsx scripts/eval-noticing.ts --all
//   npx tsx scripts/eval-noticing.ts --all --out=transcripts/noticing-eval-2026-04-23.md
//   npm run eval:noticing -- --all
//
// Reads .env.local manually (we are outside the Next.js runtime, so env vars
// are NOT injected for us). Never writes the file.
//
// Reports for each session:
//   - every candidate returned from the model
//   - whether it passed the orchestrator kill rule (validateMetaNotices)
//   - a heuristic analyst verdict: canned vs earned
//
// A notice is flagged "canned" if it (a) could plausibly fire on most
// sessions (templated phrasing like "the participant seems to imply X"
// with no transcript-specific content), (b) repeats the template's
// meta_notice_hints nearly verbatim, or (c) the why_cross_turn doesn't
// reference content unique to the transcript. Heuristic, not ground truth.

import * as fs from "node:fs";
import * as path from "node:path";
import { getTemplate } from "../src/lib/templates";
import {
  parseMetaNoticingCandidates,
  validateMetaNotices,
  type MetaNotice,
} from "../src/lib/prompts/meta-noticing";
import type { Template, Turn } from "../src/lib/types";

// --- env loader (no dotenv dep; read + parse manually) ---

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(
      `.env.local not found at ${envPath} — create it with ANTHROPIC_API_KEY=...`
    );
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// --- args ---

interface Args {
  all: boolean;
  session?: string;
  out?: string;
  label: string; // tag written into the report, e.g. "v0" or "v1"
}

function parseArgs(argv: string[]): Args {
  const out: Args = { all: false, label: "v0" };
  for (const raw of argv) {
    if (raw === "--all") {
      out.all = true;
      continue;
    }
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "session") out.session = value;
    else if (key === "out") out.out = value;
    else if (key === "label") out.label = value;
  }
  if (!out.all && !out.session) {
    throw new Error("missing required arg: --all or --session=<filename>");
  }
  return out;
}

// --- session loader ---

interface SavedSession {
  session_id?: string;
  saved_at?: string;
  template_id: string;
  started_at: string;
  active_objective_id: string | null;
  note?: string;
  turn_count: number;
  transcript: Turn[];
  extraction?: unknown;
  deployed_notices?: { turn: number; type: string }[];
}

function listSessionFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("session-") && f.endsWith(".json"))
    .sort();
}

function loadSession(dir: string, filename: string): SavedSession {
  const full = path.join(dir, filename);
  const raw = fs.readFileSync(full, "utf8");
  return JSON.parse(raw) as SavedSession;
}

// --- canned/earned heuristic ---

interface AnalystVerdict {
  judgment: "canned" | "earned" | "borderline";
  reasons: string[];
}

function judgeCannedness(
  notice: MetaNotice,
  template: Template,
  transcript: Turn[]
): AnalystVerdict {
  const reasons: string[] = [];
  let cannedScore = 0;
  let earnedScore = 0;

  const obsLower = (notice.observation ?? "").toLowerCase();
  const whyLower = (notice.why_cross_turn ?? "").toLowerCase();
  const combined = `${obsLower} ${whyLower}`;

  // (a) Near-verbatim echo of a meta_notice_hint — the canonical canned signal.
  const hints = template.objectives.flatMap((o) => o.meta_notice_hints);
  for (const hint of hints) {
    const hintLower = hint.toLowerCase();
    if (hintLower.length < 20) continue; // trivial overlap isn't meaningful
    // crude substring match; catches hints copied wholesale
    if (
      combined.includes(hintLower.slice(0, Math.min(40, hintLower.length)))
    ) {
      cannedScore += 2;
      reasons.push(`observation echoes template hint: "${hint.slice(0, 60)}..."`);
      break;
    }
    // shared 5+ word windows — softer signal
    const hintWords = hintLower.split(/\s+/).filter((w) => w.length > 4);
    if (hintWords.length >= 5) {
      const window = hintWords.slice(0, 5).join(" ");
      if (combined.includes(window)) {
        cannedScore += 1;
        reasons.push(`observation shares 5+ word window with template hint`);
        break;
      }
    }
  }

  // (b) Does the notice text reference concrete content from the transcript?
  // We tokenize the anchored participant turns and check whether any
  // distinctive token appears in the observation. "Distinctive" = length
  // >= 6 and not in a tiny stopword set. If none match, the notice is
  // suspiciously generic.
  const stopwords = new Set([
    "because",
    "through",
    "though",
    "really",
    "something",
    "someone",
    "anyone",
    "nothing",
    "should",
    "wouldn",
    "couldn",
    "happen",
    "toward",
    "before",
    "always",
    "during",
    "across",
    "across",
    "already",
    "without",
    "within",
    "between",
    "around",
    "anything",
    "everything",
  ]);
  const anchoredTokens = new Set<string>();
  for (const idx of notice.transcript_anchors ?? []) {
    const turn = transcript.find((t) => t.index === idx);
    if (!turn) continue;
    for (const tok of turn.text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (tok.length >= 6 && !stopwords.has(tok)) anchoredTokens.add(tok);
    }
  }
  const obsTokens = new Set(
    (notice.observation ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  );
  let overlap = 0;
  for (const t of anchoredTokens) if (obsTokens.has(t)) overlap++;
  if (anchoredTokens.size > 0 && overlap === 0) {
    cannedScore += 2;
    reasons.push(
      "observation uses zero distinctive tokens from the turns it cites"
    );
  } else if (overlap >= 3) {
    earnedScore += 2;
    reasons.push(
      `observation reuses ${overlap} distinctive tokens from anchored turns`
    );
  } else if (overlap >= 1) {
    earnedScore += 1;
    reasons.push(`observation reuses ${overlap} distinctive token(s) from anchored turns`);
  }

  // (c) why_cross_turn content: does it explain a transcript-specific
  // relationship or is it a generic statement like "this requires two turns
  // to see because a single turn would not show the pattern"?
  if (whyLower.length < 30) {
    cannedScore += 1;
    reasons.push("why_cross_turn is very short / formulaic");
  } else {
    // Check whether it quotes or refers to content from anchors.
    let whyOverlap = 0;
    const whyTokens = new Set(whyLower.split(/[^a-z0-9]+/).filter(Boolean));
    for (const t of anchoredTokens) if (whyTokens.has(t)) whyOverlap++;
    if (whyOverlap === 0 && anchoredTokens.size > 0) {
      cannedScore += 1;
      reasons.push("why_cross_turn uses no distinctive tokens from the cited turns");
    } else if (whyOverlap >= 2) {
      earnedScore += 1;
      reasons.push(`why_cross_turn reuses ${whyOverlap} distinctive tokens from cited turns`);
    }
  }

  // (d) multi-anchor cross-turn bonus: if anchors span far-apart turns AND
  // observation references both, that's earned.
  const anchors = [...new Set(notice.transcript_anchors ?? [])];
  if (anchors.length >= 2) {
    const span = Math.max(...anchors) - Math.min(...anchors);
    if (span >= 4) {
      earnedScore += 1;
      reasons.push(`anchors span ${span} turns — genuine cross-turn`);
    }
  }

  let judgment: AnalystVerdict["judgment"];
  if (earnedScore - cannedScore >= 2) judgment = "earned";
  else if (cannedScore - earnedScore >= 2) judgment = "canned";
  else judgment = "borderline";

  return { judgment, reasons };
}

// --- runner ---

interface SessionReport {
  filename: string;
  note: string;
  turnCount: number;
  rawCandidates: MetaNotice[];
  verdicts: { notice: MetaNotice; passed: boolean; reason: string }[];
  analyst: AnalystVerdict[]; // one per raw candidate
  error?: string;
}

async function evaluateSession(
  sessionsDir: string,
  filename: string
): Promise<SessionReport> {
  const session = loadSession(sessionsDir, filename);
  const template = getTemplate(session.template_id);
  if (!template) {
    return {
      filename,
      note: session.note ?? "",
      turnCount: session.turn_count,
      rawCandidates: [],
      verdicts: [],
      analyst: [],
      error: `unknown template_id: ${session.template_id}`,
    };
  }

  // callMetaNoticing returns ONLY the validated (passed) notices —
  // we want the full candidate list too so the harness can report
  // rejections. So we replicate the inner call here: one extra anthropic
  // round trip would be silly. Reuse the raw text path.
  //
  // Simplest approach: call callMetaNoticing to get the validated list,
  // and separately re-parse the user request + re-run the same prompt
  // through our own small helper. But that's two API calls. Better:
  // lift the raw-text call into a private helper and parse both ways.
  //
  // Pragmatic compromise: call callMetaNoticing once (gets passed list),
  // and since parseMetaNoticingOutput already drops invalid candidates,
  // we lose sight of what was dropped. So we inline a tiny duplicate
  // here that calls the SDK ourselves and keeps the raw candidates.

  const { getAnthropic } = await import("../src/lib/anthropic");
  const { MODELS } = await import("../src/lib/models");
  const { buildMetaNoticingSystem, buildMetaNoticingUser } = await import(
    "../src/lib/prompts/meta-noticing"
  );

  const anthropic = getAnthropic();
  const systemText = buildMetaNoticingSystem(template);
  const userText = buildMetaNoticingUser({
    transcript: session.transcript,
    alreadyDeployed: session.deployed_notices ?? [],
  });

  try {
    const response = await anthropic.messages.create({
      model: MODELS.metaNoticing,
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: systemText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userText }],
    });

    const contentBlocks = response.content as Array<{ type: string; text?: string }>;
    let rawText = "";
    for (const block of contentBlocks) {
      if (block.type === "text" && typeof block.text === "string") {
        rawText = block.text;
        break;
      }
    }

    let candidates: MetaNotice[] = [];
    try {
      candidates = parseMetaNoticingCandidates(rawText);
    } catch (err) {
      return {
        filename,
        note: session.note ?? "",
        turnCount: session.turn_count,
        rawCandidates: [],
        verdicts: [],
        analyst: [],
        error: `parse error: ${
          err instanceof Error ? err.message : String(err)
        } — raw: ${rawText.slice(0, 200)}`,
      };
    }

    const { verdicts } = validateMetaNotices(candidates);
    const analyst = candidates.map((c) =>
      judgeCannedness(c, template, session.transcript)
    );

    return {
      filename,
      note: session.note ?? "",
      turnCount: session.turn_count,
      rawCandidates: candidates,
      verdicts,
      analyst,
    };
  } catch (err) {
    return {
      filename,
      note: session.note ?? "",
      turnCount: session.turn_count,
      rawCandidates: [],
      verdicts: [],
      analyst: [],
      error: `API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// --- reporting ---

function formatReport(reports: SessionReport[], label: string): string {
  const lines: string[] = [];
  lines.push(`# Meta-noticing eval — ${label} — ${new Date().toISOString()}`);
  lines.push("");
  let totalCandidates = 0;
  let totalPassed = 0;
  let totalEarned = 0;
  let totalCanned = 0;
  let totalBorderline = 0;

  for (const r of reports) {
    lines.push(`## ${r.filename}`);
    lines.push(`- note: \`${r.note}\``);
    lines.push(`- turns: ${r.turnCount}`);
    if (r.error) {
      lines.push(`- **ERROR:** ${r.error}`);
      lines.push("");
      continue;
    }
    lines.push(`- candidates returned: ${r.rawCandidates.length}`);
    const passCount = r.verdicts.filter((v) => v.passed).length;
    lines.push(
      `- passed kill rule: ${passCount} / ${r.rawCandidates.length}`
    );
    totalCandidates += r.rawCandidates.length;
    totalPassed += passCount;

    if (r.rawCandidates.length === 0) {
      lines.push(`- (empty array — acceptable, may indicate under-firing)`);
      lines.push("");
      continue;
    }

    for (let i = 0; i < r.rawCandidates.length; i++) {
      const c = r.rawCandidates[i];
      const v = r.verdicts[i];
      const a = r.analyst[i];
      lines.push("");
      lines.push(
        `### candidate ${i + 1}: ${c.type} (strength=${c.strength ?? "?"})`
      );
      lines.push(
        `- anchors: [${(c.transcript_anchors ?? []).join(", ")}]`
      );
      lines.push(
        `- kill-rule: ${v.passed ? "PASS" : "REJECT"}${
          v.reason ? " — " + v.reason : ""
        }`
      );
      lines.push(`- analyst: ${a.judgment.toUpperCase()}`);
      for (const reason of a.reasons) {
        lines.push(`  - ${reason}`);
      }
      lines.push(`- observation: ${(c.observation ?? "").trim()}`);
      lines.push(
        `- why_cross_turn: ${(c.why_cross_turn ?? "").trim()}`
      );
      lines.push(
        `- suggested_deploy_language: ${(c.suggested_deploy_language ?? "").trim()}`
      );

      if (a.judgment === "earned") totalEarned++;
      else if (a.judgment === "canned") totalCanned++;
      else totalBorderline++;
    }
    lines.push("");
  }

  lines.push("## Summary");
  lines.push(`- sessions evaluated: ${reports.length}`);
  lines.push(`- total candidates: ${totalCandidates}`);
  lines.push(
    `- kill-rule pass rate: ${totalPassed} / ${totalCandidates}` +
      (totalCandidates > 0
        ? ` (${Math.round((100 * totalPassed) / totalCandidates)}%)`
        : "")
  );
  lines.push(
    `- analyst: earned=${totalEarned} canned=${totalCanned} borderline=${totalBorderline}`
  );
  lines.push("");

  return lines.join("\n");
}

// --- main ---

async function main() {
  loadEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const sessionsDir = path.resolve(process.cwd(), "transcripts");

  let files: string[];
  if (args.all) {
    files = listSessionFiles(sessionsDir);
    if (files.length === 0) {
      process.stderr.write(`no session-*.json files found in ${sessionsDir}\n`);
      process.exit(1);
    }
  } else {
    files = [args.session as string];
  }

  process.stdout.write(
    `# eval-noticing label=${args.label} files=${files.length}\n\n`
  );

  const reports: SessionReport[] = [];
  for (const f of files) {
    process.stdout.write(`evaluating ${f}...\n`);
    const report = await evaluateSession(sessionsDir, f);
    reports.push(report);
    if (report.error) {
      process.stdout.write(`  ERROR: ${report.error}\n`);
    } else {
      const passCount = report.verdicts.filter((v) => v.passed).length;
      process.stdout.write(
        `  ${report.rawCandidates.length} candidate(s), ${passCount} passed kill rule\n`
      );
    }
  }

  const markdown = formatReport(reports, args.label);
  process.stdout.write("\n");
  process.stdout.write(markdown);

  if (args.out) {
    const outPath = path.resolve(process.cwd(), args.out);
    // Append rather than overwrite — we run v0 and v1 into the same file.
    const header = fs.existsSync(outPath) ? "\n\n---\n\n" : "";
    fs.appendFileSync(outPath, header + markdown);
    process.stdout.write(`\nreport appended to ${outPath}\n`);
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.stack || err.message : String(err);
  process.stderr.write(`eval-noticing failed: ${msg}\n`);
  process.exit(1);
});
