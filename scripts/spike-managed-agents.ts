/* eslint-disable @typescript-eslint/no-explicit-any */
// Spike: does the current ANTHROPIC_API_KEY have Managed Agents beta access?
//
// Usage:
//   npx tsx scripts/spike-managed-agents.ts
//
// What it does:
//   1. Loads ANTHROPIC_API_KEY from .env.local.
//   2. Calls client.beta.agents.list() — if this 403s, the key does not have
//      Managed Agents beta enabled and the full port is a no-go.
//   3. Calls client.beta.environments.list() — environments are a prerequisite
//      for sessions, so we need to know whether we can list/create them.
//   4. Prints counts and the first item from each list (if any) so we know
//      what agent/environment IDs already exist on the account.
//
// Exit code 0 on success, 1 on any failure. This is diagnostic only — it does
// not create, modify, or delete anything.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

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

async function main(): Promise<void> {
  loadEnvLocal();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in .env.local");
  const client = new Anthropic({ apiKey });

  console.log("=== Managed Agents beta-access spike ===\n");

  // --- agents.list ---
  try {
    console.log("[1/2] beta.agents.list()");
    const agents: any[] = [];
    let n = 0;
    for await (const agent of client.beta.agents.list({ limit: 5 } as any)) {
      agents.push(agent);
      n++;
      if (n >= 5) break;
    }
    console.log(`  ok — ${agents.length} agent(s) returned`);
    for (const a of agents) {
      console.log(
        `    ${a.id}  name=${JSON.stringify(a.name)}  model=${a.model?.id ?? a.model}  created=${a.created_at}`
      );
    }
  } catch (err: any) {
    console.error("  FAILED:", err?.status ?? "", err?.message ?? err);
    if (err?.error) console.error("    body:", JSON.stringify(err.error));
    console.error("\nVerdict: key does NOT have Managed Agents beta. Abort full port.");
    process.exit(1);
  }

  // --- environments.list ---
  try {
    console.log("\n[2/2] beta.environments.list()");
    const envs: any[] = [];
    let n = 0;
    for await (const env of client.beta.environments.list({ limit: 5 } as any)) {
      envs.push(env);
      n++;
      if (n >= 5) break;
    }
    console.log(`  ok — ${envs.length} environment(s) returned`);
    for (const e of envs) {
      console.log(
        `    ${e.id}  name=${JSON.stringify(e.name)}  type=${e.config?.type}  created=${e.created_at}`
      );
    }
  } catch (err: any) {
    console.error("  FAILED:", err?.status ?? "", err?.message ?? err);
    if (err?.error) console.error("    body:", JSON.stringify(err.error));
    console.error(
      "\nVerdict: agents list worked but environments did not. Port may be partially viable; needs investigation."
    );
    process.exit(1);
  }

  console.log("\nVerdict: beta access confirmed. Proceed with end-to-end spike.");
}

main().catch((err) => {
  console.error("unexpected error:", err);
  process.exit(1);
});
