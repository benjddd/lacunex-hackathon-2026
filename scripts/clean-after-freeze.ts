// Remove anything from prod KV that wasn't present at the submission-freeze
// snapshot — i.e. visitor noise accumulated after we locked the demo state.
//
// Reads the latest transcripts/state-freeze-*.json manifest produced by
// freeze-state.ts and deletes any keys (rounds, sessions, takeaways, research,
// invites) NOT in that manifest. Index entries are pruned alongside.
//
// Default: DRY RUN — prints what would be deleted, touches nothing. Pass
// --apply to actually delete. Use --freeze=path/to/state-freeze-<iso>.json to
// pin a specific manifest; otherwise the most recent one is used.
//
// Usage:
//   npx tsx --env-file=.env.production.local scripts/clean-after-freeze.ts
//   npx tsx --env-file=.env.production.local scripts/clean-after-freeze.ts --apply

import { kv } from "@vercel/kv";
import * as fs from "node:fs";
import * as path from "node:path";

interface FreezeManifest {
  frozen_at: string;
  rounds: string[];
  sessions: string[];
  takeaways: string[];
  research: string[];
  invites: string[];
}

interface Args {
  apply: boolean;
  freezePath?: string;
}

function parseArgs(argv: string[]): Args {
  const out: Args = { apply: false };
  for (const raw of argv) {
    if (raw === "--apply") out.apply = true;
    const m = /^--freeze=(.+)$/.exec(raw);
    if (m) out.freezePath = m[1];
  }
  return out;
}

function findLatestFreeze(): string {
  const dir = path.join(process.cwd(), "transcripts");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("state-freeze-") && f.endsWith(".json"))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error(
      "no state-freeze-*.json found in transcripts/ — run freeze-state.ts first"
    );
  }
  return path.join(dir, files[0]);
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
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = args.freezePath ?? findLatestFreeze();
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8")
  ) as FreezeManifest;

  process.stdout.write(`Using freeze manifest: ${manifestPath}\n`);
  process.stdout.write(`Frozen at: ${manifest.frozen_at}\n`);
  process.stdout.write(`Mode: ${args.apply ? "APPLY (will delete)" : "dry-run"}\n\n`);

  const frozenRounds = new Set(manifest.rounds);
  const frozenSessions = new Set(manifest.sessions);
  const frozenTakeaways = new Set(manifest.takeaways);
  const frozenResearch = new Set(manifest.research);
  const frozenInvites = new Set(manifest.invites);

  // Enumerate current state.
  const currentRounds = ((await kv.zrange<string[]>("round_idx", 0, -1)) ?? []) as string[];
  const currentSessions = ((await kv.zrange<string[]>("session_idx", 0, -1)) ?? []) as string[];
  const currentTakeaways = (await scanPattern("takeaway:*")).map((k) =>
    k.replace(/^takeaway:/, "")
  );
  const currentResearch = (await scanPattern("research:*")).map((k) =>
    k.replace(/^research:/, "")
  );
  const currentInvites = (await scanPattern("invite:*")).map((k) =>
    k.replace(/^invite:/, "")
  );

  const newRounds = currentRounds.filter((id) => !frozenRounds.has(id));
  const newSessions = currentSessions.filter((id) => !frozenSessions.has(id));
  const newTakeaways = currentTakeaways.filter((id) => !frozenTakeaways.has(id));
  const newResearch = currentResearch.filter((id) => !frozenResearch.has(id));
  const newInvites = currentInvites.filter((t) => !frozenInvites.has(t));

  const summary = (label: string, items: string[]) =>
    process.stdout.write(`${label}: ${items.length}${items.length ? "  " + items.slice(0, 5).join(", ") + (items.length > 5 ? "  …" : "") : ""}\n`);
  summary("rounds to remove", newRounds);
  summary("sessions to remove", newSessions);
  summary("takeaways to remove", newTakeaways);
  summary("research reports to remove", newResearch);
  summary("invites to remove", newInvites);

  if (!args.apply) {
    process.stdout.write(`\nDry run only. Re-run with --apply to delete.\n`);
    return;
  }

  // Apply.
  for (const id of newRounds) {
    await kv.del(`round:${id}`);
    await kv.zrem("round_idx", id);
  }
  for (const id of newSessions) {
    await kv.del(`session:${id}`);
    await kv.zrem("session_idx", id);
  }
  for (const id of newTakeaways) {
    await kv.del(`takeaway:${id}`);
  }
  for (const id of newResearch) {
    await kv.del(`research:${id}`);
  }
  for (const t of newInvites) {
    await kv.del(`invite:${t}`);
  }

  process.stdout.write(
    `\nApplied. Removed ${newRounds.length} rounds, ${newSessions.length} sessions, ${newTakeaways.length} takeaways, ${newResearch.length} research, ${newInvites.length} invites.\n`
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`clean-after-freeze failed: ${msg}\n`);
  process.exit(1);
});
