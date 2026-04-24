/* eslint-disable @typescript-eslint/no-explicit-any */
// Post-hackathon archive of the Lacunex claim-verifier Managed Agent.
//
// Intended to be run manually on or after Tue 2026-04-28 10:00 IST, between
// the submission deadline (Mon 27th 03:00 IST) and the Stage 2 live round
// (Tue 28th 19:00 IST). Reads every session the agent ran during the
// hackathon window and writes a local markdown archive + summary stats.
//
// Usage:
//   npx tsx scripts/archive-managed-agent.ts
//   npx tsx scripts/archive-managed-agent.ts --from=2026-04-24 --to=2026-04-28
//
// Reads .env.local manually (outside the Next.js runtime). Read-only against
// the Anthropic API — does not run new agent sessions, create resources, or
// delete anything. Writes one markdown file under transcripts/.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// --- env loader (same pattern as other scripts/) ---
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
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
    if (!(key in process.env)) process.env[key] = val;
  }
}

// --- args ---
function parseArgs(): { from: string; to: string } {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(`--${name}=`.length) : undefined;
  };
  return {
    from: getArg("from") ?? "2026-04-24",
    to: getArg("to") ?? "2026-04-28",
  };
}

// --- baselines — what the provisioning spike saw on 2026-04-24 ---
const BASELINE = {
  active_seconds: 37,
  output_tokens: 2111,
  cache_creation_5m: 49984,
  tool_uses: 4,
};

function pct(n: number, base: number): string {
  if (base === 0) return "—";
  const p = ((n - base) / base) * 100;
  const s = p >= 0 ? `+${p.toFixed(0)}%` : `${p.toFixed(0)}%`;
  return Math.abs(p) > 30 ? `**${s}**` : s;
}

function oneLine(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const agentId = process.env.LACUNEX_CLAIM_VERIFIER_AGENT_ID;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  if (!agentId) {
    throw new Error(
      "LACUNEX_CLAIM_VERIFIER_AGENT_ID not set — run `npx tsx scripts/spike-managed-agents-e2e.ts` to provision."
    );
  }

  const { from, to } = parseArgs();
  const fromIso = `${from}T00:00:00Z`;
  const toIso = `${to}T23:59:59Z`;
  console.log(`Archiving claim-verifier sessions from ${fromIso} to ${toIso}`);

  const client = new Anthropic({ apiKey });

  // 1. list sessions in window
  const sessions: any[] = [];
  for await (const s of client.beta.sessions.list({
    agent_id: agentId,
    "created_at[gte]": fromIso,
    "created_at[lte]": toIso,
    include_archived: true,
    limit: 100,
  } as any)) {
    sessions.push(s);
  }
  console.log(`Found ${sessions.length} session(s)`);

  const rows: Array<{
    id: string;
    created_at: string;
    status: string;
    stop_reason: string | null;
    active_seconds: number;
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
    tool_uses: number;
    tool_errors: number;
    report_excerpt: string;
    anomaly: string | null;
  }> = [];

  // 2. per-session event pull
  for (const s of sessions) {
    console.log(`  pulling events for ${s.id}`);
    let stopReason: string | null = null;
    let terminated = false;
    let toolUses = 0;
    let toolErrors = 0;
    const reportChunks: string[] = [];
    for await (const ev of client.beta.sessions.events.list(s.id, { limit: 200 } as any)) {
      const e = ev as any;
      if (e.type === "agent.tool_use") toolUses++;
      if (e.type === "agent.tool_result" && e.is_error) toolErrors++;
      if (e.type === "agent.message") {
        for (const c of e.content ?? []) {
          if (c.type === "text" && typeof c.text === "string") reportChunks.push(c.text);
        }
      }
      if (e.type === "session.status_idle") {
        stopReason = e.stop_reason?.type ?? null;
      }
      if (e.type === "session.status_terminated") terminated = true;
    }

    const anomalies: string[] = [];
    if (terminated) anomalies.push("session terminated");
    if (stopReason && stopReason !== "end_turn") anomalies.push(`stop_reason=${stopReason}`);
    if (toolErrors > 0) anomalies.push(`${toolErrors} tool error(s)`);
    if (reportChunks.length === 0) anomalies.push("empty report");

    rows.push({
      id: s.id,
      created_at: s.created_at,
      status: s.status,
      stop_reason: stopReason,
      active_seconds: s.stats?.active_seconds ?? 0,
      input_tokens: s.usage?.input_tokens ?? 0,
      output_tokens: s.usage?.output_tokens ?? 0,
      cache_read: s.usage?.cache_read_input_tokens ?? 0,
      tool_uses: toolUses,
      tool_errors: toolErrors,
      report_excerpt: oneLine(reportChunks.join(" ")),
      anomaly: anomalies.length ? anomalies.join("; ") : null,
    });
  }

  // 3. compose markdown
  const n = rows.length;
  const totalActive = rows.reduce((a, r) => a + r.active_seconds, 0);
  const totalIn = rows.reduce((a, r) => a + r.input_tokens, 0);
  const totalOut = rows.reduce((a, r) => a + r.output_tokens, 0);
  const totalCacheRead = rows.reduce((a, r) => a + r.cache_read, 0);
  const totalTools = rows.reduce((a, r) => a + r.tool_uses, 0);
  const meanActive = n ? totalActive / n : 0;
  const meanOut = n ? totalOut / n : 0;
  const meanTools = n ? totalTools / n : 0;
  const anomalies = rows.filter((r) => r.anomaly);

  const outPath = path.resolve(
    process.cwd(),
    "transcripts",
    `managed-agent-archive-${new Date().toISOString().slice(0, 10)}.md`
  );

  const lines: string[] = [];
  lines.push(`# Managed Agent archive — claim verifier`);
  lines.push(``);
  lines.push(`Window: ${fromIso} → ${toIso}`);
  lines.push(`Agent: \`${agentId}\``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  if (n === 0) {
    lines.push(
      `**No sessions found in the window.** Either the Run-agent button was never clicked during the hackathon, or sessions were archived outside this window.`
    );
    lines.push(``);
  } else {
    lines.push(`| metric | total | mean / session | drift vs 2026-04-24 spike |`);
    lines.push(`|---|---:|---:|:---:|`);
    lines.push(`| sessions | ${n} | — | — |`);
    lines.push(`| active_seconds | ${totalActive.toFixed(1)} | ${meanActive.toFixed(1)} | ${pct(meanActive, BASELINE.active_seconds)} |`);
    lines.push(`| input_tokens | ${totalIn} | ${(totalIn / n).toFixed(0)} | — |`);
    lines.push(`| output_tokens | ${totalOut} | ${meanOut.toFixed(0)} | ${pct(meanOut, BASELINE.output_tokens)} |`);
    lines.push(`| cache_read | ${totalCacheRead} | ${(totalCacheRead / n).toFixed(0)} | — |`);
    lines.push(`| web_search calls | ${totalTools} | ${meanTools.toFixed(1)} | ${pct(meanTools, BASELINE.tool_uses)} |`);
    lines.push(``);
    lines.push(`Bold drift values = more than 30% change from the provisioning-spike baseline. That is the signal to look at whether prompts, transcripts, or caching changed mid-hackathon.`);
    lines.push(``);
  }

  lines.push(`## Anomalies`);
  lines.push(``);
  if (anomalies.length === 0) {
    lines.push(`None. Every session completed with \`end_turn\`, no tool errors, non-empty report.`);
  } else {
    for (const r of anomalies) {
      lines.push(`- \`${r.id}\` (${r.created_at}): ${r.anomaly}`);
    }
  }
  lines.push(``);

  lines.push(`## Per-session detail`);
  lines.push(``);
  if (n === 0) {
    lines.push(`_(none)_`);
  } else {
    lines.push(`| session_id | created_at | active_s | in | out | cache_read | searches | report (first ~120 chars) |`);
    lines.push(`|---|---|---:|---:|---:|---:|---:|---|`);
    for (const r of rows.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      lines.push(
        `| \`${r.id}\` | ${r.created_at} | ${r.active_seconds.toFixed(1)} | ${r.input_tokens} | ${r.output_tokens} | ${r.cache_read} | ${r.tool_uses} | ${r.report_excerpt.replace(/\|/g, "\\|")} |`
      );
    }
    lines.push(``);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Next: review the file, then \`git add\` + \`git commit\` if you want the archive in history.`);
}

main().catch((err) => {
  console.error("archive failed:", err?.status ?? "", err?.message ?? err);
  if (err?.error) console.error("body:", JSON.stringify(err.error));
  process.exit(1);
});
