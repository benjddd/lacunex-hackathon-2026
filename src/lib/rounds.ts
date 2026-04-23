import { promises as fs } from "node:fs";
import path from "node:path";
import type { Round, RoundAggregate, RoundStatus } from "./types";
import {
  hostedSaveRound,
  hostedGetRound,
  hostedListRounds,
} from "./store-hosted";

// Rounds are the cross-participant grouping. A round is N sessions run against
// the same brief, aggregated into a cohort-level picture.
//
// Storage layout (dev-only, filesystem-based):
//
//   transcripts/
//     session-<id>.json          -- individual session (existing)
//     takeaway-<id>.md           -- participant artifact (existing)
//     rounds/
//       round-<round_id>.json    -- round record (new)
//
// The transcripts/ directory is gitignored. This is local-dev only; when we
// deploy on Fri, either (a) ship as a no-op in prod, (b) move to Vercel KV,
// or (c) switch to a client-side approach. See INTERNAL §9.

const ROUNDS_DIR = "rounds";

function roundsDir(): string {
  return path.join(process.cwd(), "transcripts", ROUNDS_DIR);
}

function roundPath(roundId: string): string {
  return path.join(roundsDir(), `round-${roundId}.json`);
}

function isoStamp(d: Date = new Date()): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

export async function createRound(params: {
  templateId: string;
  label: string;
  targetParticipantCount?: number | null;
  targetDate?: string | null;
  note?: string | null;
  sessionIds?: string[];
}): Promise<Round> {
  const now = new Date();
  const round: Round = {
    round_id: isoStamp(now),
    label: params.label,
    template_id: params.templateId,
    created_at: now.toISOString(),
    target_participant_count: params.targetParticipantCount ?? null,
    target_date: params.targetDate ?? null,
    session_ids: params.sessionIds ?? [],
    status: "open",
    aggregate: null,
    live_synthesis: null,
    note: params.note ?? null,
  };
  if (process.env.VERCEL) {
    await hostedSaveRound(round);
    return round;
  }
  await fs.mkdir(roundsDir(), { recursive: true });
  await fs.writeFile(roundPath(round.round_id), JSON.stringify(round, null, 2), "utf-8");
  return round;
}

export async function listRounds(): Promise<Round[]> {
  if (process.env.VERCEL) return hostedListRounds();
  try {
    const entries = await fs.readdir(roundsDir());
    const rounds: Round[] = [];
    for (const e of entries.filter((f) => f.startsWith("round-") && f.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(roundsDir(), e), "utf-8");
        rounds.push(JSON.parse(raw) as Round);
      } catch (err) {
        console.warn(`[rounds] skip ${e}:`, err);
      }
    }
    rounds.sort((a, b) => b.round_id.localeCompare(a.round_id));
    return rounds;
  } catch {
    return [];
  }
}

export async function readRound(roundId: string): Promise<Round | null> {
  if (process.env.VERCEL) return hostedGetRound(roundId);
  try {
    const raw = await fs.readFile(roundPath(roundId), "utf-8");
    return JSON.parse(raw) as Round;
  } catch {
    return null;
  }
}

export async function writeRound(round: Round): Promise<void> {
  if (process.env.VERCEL) {
    await hostedSaveRound(round);
    return;
  }
  await fs.mkdir(roundsDir(), { recursive: true });
  await fs.writeFile(roundPath(round.round_id), JSON.stringify(round, null, 2), "utf-8");
}

export async function addSessionToRound(
  roundId: string,
  sessionId: string
): Promise<Round | null> {
  const round = await readRound(roundId);
  if (!round) return null;
  if (round.session_ids.includes(sessionId)) return round; // idempotent
  round.session_ids.push(sessionId);
  await writeRound(round);
  return round;
}

export async function setRoundAggregate(
  roundId: string,
  aggregate: RoundAggregate,
  status: RoundStatus = "closed"
): Promise<Round | null> {
  const round = await readRound(roundId);
  if (!round) return null;
  round.aggregate = aggregate;
  round.status = status;
  await writeRound(round);
  return round;
}

export async function setRoundLiveSynthesis(
  roundId: string,
  synthesis: RoundAggregate
): Promise<Round | null> {
  const round = await readRound(roundId);
  if (!round) return null;
  round.live_synthesis = synthesis;
  await writeRound(round);
  return round;
}

export function isValidRoundId(id: string): boolean {
  // Defensive — route params get passed into path.join, so reject anything
  // that could traverse.
  return /^[A-Za-z0-9._-]+$/.test(id);
}
