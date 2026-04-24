/* eslint-disable @typescript-eslint/no-explicit-any */
// Spike 2: end-to-end Managed Agents run.
//
// Goal: prove we can create an env + agent + session, send a transcript,
// watch the agent use web_search, and collect a structured report —
// the exact path the /api/sessions/[id]/research route will take.
//
// Idempotency: finds existing env/agent by metadata key `lacunex_role`
// instead of creating duplicates on every run. Writes the resolved IDs
// to .env.local (appending new keys, not overwriting) so the route can
// read them at runtime.
//
// Usage:
//   npx tsx scripts/spike-managed-agents-e2e.ts
//
// Exit 0 on success, 1 on failure.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const ENV_NAME = "lacunex-claim-verifier-env";
const AGENT_NAME = "Lacunex claim verifier";
const ENV_ROLE_TAG = "claim_verifier_env";
const AGENT_ROLE_TAG = "claim_verifier";

const AGENT_SYSTEM = `You are a post-interview fact-checker for a qualitative research platform. You receive a transcript of an interview session. Your job is to:

1. Identify 3–5 specific, verifiable factual claims made by the participant (skip opinions, feelings, and vague assertions — focus on concrete facts that can be checked: statistics, dates, named events, product features, market claims, regulatory claims).
2. For each claim, run a web search to verify or refute it.
3. Produce a concise Fact-Check Report in markdown.

Report structure:
## Fact-Check Report

For each claim:
**Claim:** [quote or close paraphrase from transcript]
**Verdict:** Supported / Refuted / Unverifiable / Partially supported
**Evidence:** 1–2 sentences summarising what you found, with source names inline (no raw URLs).

End with:
**Coverage note:** [1 sentence on which claim types were NOT checked and why — e.g. opinions, future predictions, internal company data]

Keep the report under 400 words. Do not invent claims not present in the transcript.`;

const TEST_TRANSCRIPT = `[Interviewer turn 1]: What's the biggest challenge you're seeing in your market right now?

[Participant turn 2]: Honestly, it's customer acquisition cost. CAC in B2B SaaS has gone up something like 70% since 2019, and most of our competitors are still running playbooks that assume 2018-era economics. We benchmarked against Salesforce's published S-1 data and our CAC payback period is about 14 months, which is actually decent for our segment.

[Interviewer turn 3]: Why do you think it's gone up so much?

[Participant turn 4]: Three things. LinkedIn ad prices roughly doubled during COVID — Microsoft reported that in their Q2 2022 earnings call. Cold email deliverability cratered when Google and Yahoo tightened sender requirements in February 2024. And the main thing is that every SaaS company in our category is now running the same paid-search bidding on the same five keywords. I've seen CPCs on "CRM for [our vertical]" go from $12 to over $80.`;

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
    if (!(key in process.env)) process.env[key] = val;
  }
}

function upsertEnvLocal(updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [k, v] of Object.entries(updates)) {
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(raw)) {
      raw = raw.replace(re, `${k}=${v}`);
    } else {
      if (raw.length && !raw.endsWith("\n")) raw += "\n";
      raw += `${k}=${v}\n`;
    }
  }
  fs.writeFileSync(envPath, raw, "utf8");
}

async function findOrCreateEnvironment(client: Anthropic): Promise<string> {
  for await (const env of client.beta.environments.list({ limit: 50 } as any)) {
    if ((env as any).metadata?.lacunex_role === ENV_ROLE_TAG) {
      console.log(`  reusing environment ${env.id} (${env.name})`);
      return env.id;
    }
  }
  console.log("  creating new environment...");
  const env = await client.beta.environments.create({
    name: ENV_NAME,
    description: "Lacunex claim-verifier container (cloud, unrestricted network for web_search)",
    metadata: { lacunex_role: ENV_ROLE_TAG },
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  });
  console.log(`  created environment ${env.id}`);
  return env.id;
}

async function findOrCreateAgent(client: Anthropic): Promise<string> {
  for await (const agent of client.beta.agents.list({ limit: 50 } as any)) {
    if ((agent as any).metadata?.lacunex_role === AGENT_ROLE_TAG) {
      console.log(`  reusing agent ${agent.id} (${agent.name}, v${agent.version})`);
      return agent.id;
    }
  }
  console.log("  creating new agent...");
  const agent = await client.beta.agents.create({
    name: AGENT_NAME,
    description: "Post-interview fact-checker: identifies 3–5 verifiable claims and web-searches each.",
    metadata: { lacunex_role: AGENT_ROLE_TAG },
    model: "claude-opus-4-7",
    system: AGENT_SYSTEM,
    tools: [
      {
        type: "agent_toolset_20260401",
        default_config: { enabled: false, permission_policy: { type: "always_allow" } },
        configs: [
          {
            name: "web_search",
            enabled: true,
            permission_policy: { type: "always_allow" },
          },
        ],
      },
    ],
  });
  console.log(`  created agent ${agent.id} (v${agent.version})`);
  return agent.id;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  const client = new Anthropic({ apiKey });

  console.log("=== Managed Agents end-to-end spike ===\n");

  console.log("[1/5] resolve environment");
  const environmentId = await findOrCreateEnvironment(client);

  console.log("\n[2/5] resolve agent");
  const agentId = await findOrCreateAgent(client);

  upsertEnvLocal({
    LACUNEX_CLAIM_VERIFIER_AGENT_ID: agentId,
    LACUNEX_CLAIM_VERIFIER_ENV_ID: environmentId,
  });
  console.log("  wrote AGENT_ID + ENV_ID to .env.local");

  console.log("\n[3/5] create session");
  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: "Spike: claim verification",
  });
  console.log(`  session ${session.id} status=${session.status}`);

  console.log("\n[4/5] send user.message (test transcript) + stream events");
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: TEST_TRANSCRIPT }],
      },
    ],
  });
  console.log("  user.message sent");

  const stream = await client.beta.sessions.events.stream(session.id);
  const reportChunks: string[] = [];
  const t0 = Date.now();
  let done = false;
  for await (const ev of stream) {
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const anyEv = ev as any;
    switch (anyEv.type) {
      case "session.status_running":
        console.log(`  [${dt}s] session.status_running`);
        break;
      case "agent.thinking":
        console.log(`  [${dt}s] agent.thinking`);
        break;
      case "agent.tool_use":
        console.log(
          `  [${dt}s] agent.tool_use name=${anyEv.name} input=${JSON.stringify(anyEv.input).slice(0, 120)}`
        );
        break;
      case "agent.tool_result":
        console.log(
          `  [${dt}s] agent.tool_result is_error=${anyEv.is_error ?? false} content_blocks=${(anyEv.content ?? []).length}`
        );
        break;
      case "agent.message": {
        const text = (anyEv.content ?? [])
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("");
        reportChunks.push(text);
        console.log(`  [${dt}s] agent.message len=${text.length}`);
        break;
      }
      case "span.model_request_start":
      case "span.model_request_end":
        break;
      case "session.status_idle": {
        const stop = anyEv.stop_reason?.type;
        console.log(`  [${dt}s] session.status_idle stop_reason=${stop}`);
        if (stop === "end_turn" || stop === "retries_exhausted") {
          done = true;
        } else if (stop === "requires_action") {
          console.warn("    agent is blocked on user input — spike does not handle this");
          done = true;
        }
        break;
      }
      case "session.status_terminated":
        console.log(`  [${dt}s] session.status_terminated`);
        done = true;
        break;
      case "session.error":
        console.error(
          `  [${dt}s] session.error ${anyEv.error?.type}: ${anyEv.error?.message} retry=${anyEv.error?.retry_status?.type}`
        );
        break;
      default:
        console.log(`  [${dt}s] ${anyEv.type}`);
    }
    if (done) break;
  }

  console.log("\n[5/5] collect report");
  const report = reportChunks.join("\n\n").trim();
  console.log(`  report length: ${report.length} chars`);
  console.log("\n--- REPORT ---\n");
  console.log(report);
  console.log("\n--- END ---\n");

  const final = await client.beta.sessions.retrieve(session.id);
  console.log("session usage:", JSON.stringify(final.usage));
  console.log("session stats:", JSON.stringify(final.stats));

  if (!report) {
    console.error("\nVerdict: no report text collected. Investigate before proceeding.");
    process.exit(1);
  }
  console.log("\nVerdict: end-to-end run succeeded. Safe to port the route.");
}

main().catch((err) => {
  console.error("\nunexpected error:", err?.status ?? "", err?.message ?? err);
  if (err?.error) console.error("body:", JSON.stringify(err.error));
  process.exit(1);
});
