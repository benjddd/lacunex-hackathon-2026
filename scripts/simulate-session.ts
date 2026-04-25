/* eslint-disable @typescript-eslint/no-explicit-any */
// Dev script: drive a synthetic interview end-to-end against the running
// Next.js dev server, then save the full session to disk via /api/save-session.
//
// Usage:
//   npx tsx scripts/simulate-session.ts --persona=evasive_pm --turns=6
//   npm run sim -- --persona=brief_responder --turns=8 --note="smoke-test"
//
// Requires the dev server to be up on http://localhost:3000.
//
// This is infrastructure for testing conductor (and later meta-noticing)
// prompts without a human typing. Not imported by the app.

import type {
  ConductorDecision,
  ExtractionState,
  Turn,
} from "../src/lib/types";
import type { MetaNotice } from "../src/lib/prompts/meta-noticing";

interface DeployedNoticeRef {
  turn: number;
  type: string;
}

const BASE_URL = "http://localhost:3000";
const DEFAULT_TEMPLATE = "founder-product-ideation";

interface Args {
  persona: string;
  turns: number;
  template: string;
  note?: string;
  round?: string; // if provided, the saved session is attached to this round_id
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { template: DEFAULT_TEMPLATE };
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "persona") out.persona = value;
    else if (key === "turns") out.turns = parseInt(value, 10);
    else if (key === "template") out.template = value;
    else if (key === "note") out.note = value;
    else if (key === "round") out.round = value;
  }
  if (!out.persona) {
    throw new Error("missing required arg: --persona=<id>");
  }
  if (!out.turns || Number.isNaN(out.turns) || out.turns < 1) {
    throw new Error("missing or invalid arg: --turns=<positive integer>");
  }
  return out as Args;
}

interface TurnResponse {
  decision: ConductorDecision;
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  notices?: {
    candidates: MetaNotice[];
    deployed: MetaNotice | null;
  };
  error?: string;
}

interface SimulateResponse {
  text: string;
  error?: string;
}

interface SaveResponse {
  ok: boolean;
  path: string;
  turns: number;
  error?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data?.error ?? `HTTP ${res.status}`;
    throw new Error(`${path} failed: ${msg}`);
  }
  return data as T;
}

function printTurn(turn: Turn) {
  const label = turn.role === "host" ? "Host" : "Participant";
  const lines = turn.text.split(/\r?\n/);
  const first = lines[0] ?? "";
  const rest = lines.slice(1);
  process.stdout.write(`[${turn.index}] ${label}: ${first}\n`);
  for (const line of rest) {
    process.stdout.write(`    ${line}\n`);
  }
  process.stdout.write("\n");
}

async function fetchHostTurn(
  templateId: string,
  transcript: Turn[],
  extraction: ExtractionState | undefined,
  activeObjectiveId: string | null,
  startedAtIso: string,
  deployedNotices: DeployedNoticeRef[]
): Promise<TurnResponse> {
  return postJson<TurnResponse>("/api/turn", {
    templateId,
    transcript,
    extraction,
    activeObjectiveId,
    startedAtIso,
    deployedNotices,
  });
}

// Build a Turn object that captures everything the conductor decided for this
// host turn — move_type, anchor_turn, reasoning, deployed notice, and all
// candidate notices — so the saved session shows ◆ and ↩ badges in the UI
// without re-running meta-noticing.
function buildHostTurn(
  index: number,
  res: TurnResponse,
  objectiveIdForThisTurn: string | null
): Turn {
  const turn: Turn = {
    index,
    role: "host",
    text: res.decision.next_utterance,
    at: new Date().toISOString(),
  };
  if (res.decision.reasoning) turn.reasoning = res.decision.reasoning;
  if (res.decision.move_type) turn.move_type = res.decision.move_type;
  if (res.decision.anchor_turn !== undefined) {
    turn.anchor_turn = res.decision.anchor_turn;
  }
  if (objectiveIdForThisTurn) turn.objective_id = objectiveIdForThisTurn;
  if (res.notices?.deployed) {
    turn.deployed_notice = {
      type: res.notices.deployed.type,
      anchors: res.notices.deployed.transcript_anchors,
      observation: res.notices.deployed.observation,
    };
  }
  if (res.notices?.candidates && res.notices.candidates.length > 0) {
    turn.notice_candidates = res.notices.candidates.map((c) => ({
      type: c.type,
      strength: c.strength,
      transcript_anchors: c.transcript_anchors,
      observation: c.observation,
    }));
  }
  return turn;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAtIso = new Date().toISOString();

  process.stdout.write(
    `# simulate-session persona=${args.persona} turns=${args.turns} template=${args.template}\n\n`
  );

  const transcript: Turn[] = [];
  let extraction: ExtractionState | undefined = undefined;
  let activeObjectiveId: string | null = null;
  const deployedNotices: DeployedNoticeRef[] = [];

  // 1. Host opening turn (empty transcript in).
  {
    const objectiveForThisTurn = activeObjectiveId;
    const res = await fetchHostTurn(
      args.template,
      transcript,
      extraction,
      activeObjectiveId,
      startedAtIso,
      deployedNotices
    );
    extraction = res.extraction;
    activeObjectiveId = res.activeObjectiveId;
    const hostTurn = buildHostTurn(transcript.length, res, objectiveForThisTurn);
    transcript.push(hostTurn);
    printTurn(hostTurn);
  }

  // 2. Loop: participant reply, then host response.
  for (let i = 0; i < args.turns; i++) {
    const simRes = await postJson<SimulateResponse>("/api/simulate-participant", {
      personaId: args.persona,
      transcript,
    });
    const participantTurn: Turn = {
      index: transcript.length,
      role: "participant",
      text: simRes.text,
      at: new Date().toISOString(),
    };
    transcript.push(participantTurn);
    printTurn(participantTurn);

    const objectiveForThisTurn = activeObjectiveId;
    const res = await fetchHostTurn(
      args.template,
      transcript,
      extraction,
      activeObjectiveId,
      startedAtIso,
      deployedNotices
    );
    extraction = res.extraction;
    activeObjectiveId = res.activeObjectiveId;
    const hostTurn = buildHostTurn(transcript.length, res, objectiveForThisTurn);

    if (res.notices?.deployed) {
      deployedNotices.push({
        turn: hostTurn.index,
        type: res.notices.deployed.type,
      });
      process.stdout.write(
        `  ◆ deployed meta-notice (${res.notices.deployed.type}, anchors ${JSON.stringify(res.notices.deployed.transcript_anchors)})\n`
      );
    }
    if (res.decision.move_type === "anchor_return") {
      process.stdout.write(
        `  ↩ anchor_return → turn ${res.decision.anchor_turn}\n`
      );
    }

    transcript.push(hostTurn);
    printTurn(hostTurn);

    if (res.decision.move_type === "wrap_up") {
      process.stdout.write("# conductor wrapped up — ending loop early\n\n");
      break;
    }
  }

  // 3. Save.
  const saveRes = await postJson<SaveResponse>("/api/save-session", {
    templateId: args.template,
    transcript,
    extraction,
    activeObjectiveId,
    startedAtIso,
    note: args.note ?? `sim:${args.persona}`,
    roundId: args.round,
  });

  process.stdout.write(`# saved ${saveRes.turns} turns → ${saveRes.path}\n`);
  if (args.round) {
    const attached = (saveRes as { roundId?: string | null }).roundId ?? null;
    if (attached) {
      process.stdout.write(`# attached to round ${attached}\n`);
    } else {
      process.stderr.write(`# WARNING: round ${args.round} not found — session saved but not attached\n`);
    }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`simulate-session failed: ${msg}\n`);
  process.exit(1);
});
