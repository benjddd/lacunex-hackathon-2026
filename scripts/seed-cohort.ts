// Seed a locally-built cohort onto a deployed Lacunex instance.
//
// Reads from disk:
//   - the round (resolved via /api/rounds/<id> on localhost — keeps round
//     state authoritative through the dev API rather than re-deriving)
//   - every session referenced by the round (transcripts/session-<id>.json)
//   - matching takeaway markdown (transcripts/takeaway-<id>.md), if present
//   - matching research report (transcripts/research-<id>.md), if present
//
// Posts the bundle to <target>/api/_seed-round, gated by the same bypass
// token that gates rate-limit on the deployed instance: env var
// RATE_LIMIT_BYPASS_TOKEN (or pass --token=<value> on the CLI).
//
// Usage:
//   # primary: read token from env (matches the prod env var name)
//   RATE_LIMIT_BYPASS_TOKEN=<value> \
//     npx tsx scripts/seed-cohort.ts \
//       --round=2026-04-24T21-21-52-268Z \
//       --target=https://lacunex.com
//
//   # alternate: pass the token explicitly
//   npx tsx scripts/seed-cohort.ts --round=<id> --target=<url> --token=<value>
//
// The dev server on http://localhost:3000 must be running so this script
// can pull the round payload from /api/rounds/<id> (which loads the round
// + sessions from local disk in dev mode).

import * as fs from "node:fs";
import * as path from "node:path";

const LOCAL = "http://localhost:3000";

interface Args {
  roundId: string;
  target: string;
  token: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { dryRun: false };
  for (const raw of argv) {
    if (raw === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "round") out.roundId = value;
    else if (key === "target") out.target = value;
    else if (key === "token") out.token = value;
  }
  if (!out.roundId) throw new Error("missing --round=<id>");
  if (!out.target) throw new Error("missing --target=<base url>");
  if (!out.token) {
    // Match the env var name actually set on the deployed instance.
    out.token =
      process.env.RATE_LIMIT_BYPASS_TOKEN ??
      process.env.LACUNEX_BYPASS_TOKEN ??
      "";
    if (!out.token) {
      throw new Error(
        "missing --token=<bypass> (or set RATE_LIMIT_BYPASS_TOKEN env var)"
      );
    }
  }
  // Strip trailing slashes from target.
  out.target = out.target.replace(/\/+$/, "");
  return out as Args;
}

interface RoundEnvelope {
  round?: {
    round_id: string;
    label: string;
    template_id: string;
    created_at: string;
    target_participant_count: number | null;
    target_date: string | null;
    session_ids: string[];
    status: string;
    aggregate: unknown;
    live_synthesis: unknown;
    note: string | null;
  };
  error?: string;
}

interface SessionDoc {
  session_id: string;
  saved_at?: string;
  template_id?: string;
  template_json?: unknown;
  started_at?: string | null;
  active_objective_id?: string | null;
  note?: string | null;
  turn_count?: number;
  transcript: unknown;
  extraction: unknown;
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function readMaybe(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Step 1 — pull the round from the local dev server.
  const roundRes = await fetch(`${LOCAL}/api/rounds/${args.roundId}`);
  if (!roundRes.ok) {
    throw new Error(
      `Failed to fetch local round ${args.roundId}: HTTP ${roundRes.status}`
    );
  }
  const roundPayload = (await roundRes.json()) as RoundEnvelope;
  const round = roundPayload.round;
  if (!round) {
    throw new Error(`Local round ${args.roundId} not found`);
  }

  console.log(
    `Found local round: ${round.label} (${round.session_ids.length} sessions)`
  );

  // Step 2 — load every session JSON from disk.
  const transcriptsDir = path.join(process.cwd(), "transcripts");
  const sessions: { session_id: string; payload: SessionDoc }[] = [];
  const takeaways: { session_id: string; markdown: string }[] = [];
  const research: { session_id: string; report: string }[] = [];

  for (const sid of round.session_ids) {
    const sessionPath = path.join(transcriptsDir, `session-${sid}.json`);
    if (!fs.existsSync(sessionPath)) {
      console.warn(`  ! missing session file: ${sessionPath} — skipping`);
      continue;
    }
    const doc = readJson<SessionDoc>(sessionPath);
    sessions.push({ session_id: sid, payload: doc });

    const takeawayPath = path.join(transcriptsDir, `takeaway-${sid}.md`);
    const t = readMaybe(takeawayPath);
    if (t) takeaways.push({ session_id: sid, markdown: t });

    const researchPath = path.join(transcriptsDir, `research-${sid}.md`);
    const r = readMaybe(researchPath);
    if (r) research.push({ session_id: sid, report: r });
  }

  console.log(
    `Bundled ${sessions.length} sessions, ${takeaways.length} takeaways, ${research.length} research reports`
  );

  if (args.dryRun) {
    console.log(`(dry run) would POST to ${args.target}/api/_seed-round`);
    return;
  }

  // Step 3 — POST to the target. Round + sessions in one shot; the endpoint
  // is idempotent (re-runs overwrite). Bypass token in the header.
  const res = await fetch(`${args.target}/api/_seed-round`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bypass-token": args.token,
    },
    body: JSON.stringify({
      round,
      sessions,
      takeaways,
      research,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Seed failed: HTTP ${res.status}\n${text.slice(0, 600)}`);
  }
  console.log(`OK · ${res.status}`);
  console.log(text);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`seed-cohort failed: ${msg}\n`);
  process.exit(1);
});
