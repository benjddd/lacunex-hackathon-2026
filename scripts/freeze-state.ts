// Snapshot the prod KV state at submission-freeze moment.
//
// Writes a manifest of every round / session / takeaway / research / invite
// that currently exists in Vercel KV, so a later run of clean-after-freeze.ts
// can remove anything created after this point (visitor noise post-recording).
//
// Usage (token + KV creds come from .env.production.local pulled via
// `vercel env pull --environment=production .env.production.local`):
//
//   npx tsx --env-file=.env.production.local scripts/freeze-state.ts
//
// Output: transcripts/state-freeze-<iso>.json

import { kv } from "@vercel/kv";
import * as fs from "node:fs";
import * as path from "node:path";

interface FreezeManifest {
  frozen_at: string;
  notes: string;
  rounds: string[];
  sessions: string[];
  takeaways: string[]; // session IDs that have a takeaway
  research: string[]; // session IDs that have a research report
  invites: string[]; // invite tokens
}

async function scanPattern(match: string): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | number = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [next, batch] = (await kv.scan(cursor, { match, count: 200 })) as [
      string | number,
      string[]
    ];
    out.push(...batch);
    if (String(next) === "0") break;
    cursor = next;
  }
  return out;
}

async function main() {
  const frozenAt = new Date().toISOString();

  // Rounds + sessions are tracked in sorted-set indexes; takeaways / research /
  // invites are keyed only by id, so we SCAN for those patterns.
  const roundIds = ((await kv.zrange<string[]>("round_idx", 0, -1)) ?? []) as string[];
  const sessionIds = ((await kv.zrange<string[]>("session_idx", 0, -1)) ?? []) as string[];

  const takeawayKeys = await scanPattern("takeaway:*");
  const researchKeys = await scanPattern("research:*");
  const inviteKeys = await scanPattern("invite:*");

  const stripPrefix = (prefix: string, keys: string[]) =>
    keys.map((k) => k.replace(new RegExp(`^${prefix}`), ""));

  const manifest: FreezeManifest = {
    frozen_at: frozenAt,
    notes:
      "Snapshot of Vercel KV state at submission-freeze moment. Used by clean-after-freeze.ts to remove anything created after this timestamp (visitor noise post-recording).",
    rounds: roundIds,
    sessions: sessionIds,
    takeaways: stripPrefix("takeaway:", takeawayKeys),
    research: stripPrefix("research:", researchKeys),
    invites: stripPrefix("invite:", inviteKeys),
  };

  const outDir = path.join(process.cwd(), "transcripts");
  fs.mkdirSync(outDir, { recursive: true });
  const safeIso = frozenAt.replace(/[:.]/g, "-");
  const outPath = path.join(outDir, `state-freeze-${safeIso}.json`);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));

  process.stdout.write(`Frozen at ${frozenAt}\n`);
  process.stdout.write(
    `  rounds=${manifest.rounds.length} sessions=${manifest.sessions.length} takeaways=${manifest.takeaways.length} research=${manifest.research.length} invites=${manifest.invites.length}\n`
  );
  process.stdout.write(`Wrote ${outPath}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`freeze-state failed: ${msg}\n`);
  process.exit(1);
});
