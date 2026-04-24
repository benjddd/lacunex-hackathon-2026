import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  hostedGetInvite,
  hostedSaveInvite,
  type InviteRecord,
} from "./store-hosted";

// Default max turns per invite link. A host can change this per-invite via
// the API, but the POC just uses this constant. 40 covers a long interview
// (our briefs are sized ~15 turns) with comfortable headroom.
export const DEFAULT_TURN_BUDGET = 40;

// Per-session shareable invite links.
//
// A host creates a token bound to one brief; the participant opens /i/<token>
// and runs that brief. Tokens are unguessable (16 chars, 96 bits of entropy)
// so the gate is obscurity, not authentication — sufficient for a POC to keep
// the dashboard at `/` from accidental participant access without adding auth
// scope.
//
// Storage mirrors rounds.ts: filesystem in dev, Vercel KV (or in-process Map
// fallback) in hosted. No expiry, no revoke — out of scope for the POC.

const INVITES_DIR = "invites";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function invitesDir(): string {
  return path.join(process.cwd(), "transcripts", INVITES_DIR);
}

function invitePath(token: string): string {
  return path.join(invitesDir(), `invite-${token}.json`);
}

function generateToken(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += BASE58_ALPHABET[bytes[i] % BASE58_ALPHABET.length];
  }
  return out;
}

export function isValidToken(token: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{16}$/.test(token);
}

export async function createInvite(params: {
  templateId: string;
  note?: string | null;
  turnBudget?: number;
}): Promise<InviteRecord> {
  const invite: InviteRecord = {
    token: generateToken(),
    template_id: params.templateId,
    created_at: new Date().toISOString(),
    note: params.note ?? null,
    turn_budget: params.turnBudget ?? DEFAULT_TURN_BUDGET,
    turns_used: 0,
  };
  await writeInvite(invite);
  return invite;
}

export async function resolveInvite(token: string): Promise<InviteRecord | null> {
  if (!isValidToken(token)) return null;
  const raw = await readInvite(token);
  if (!raw) return null;
  // Back-compat: older invites may predate turn_budget/turns_used.
  return {
    ...raw,
    turn_budget: typeof raw.turn_budget === "number" ? raw.turn_budget : DEFAULT_TURN_BUDGET,
    turns_used: typeof raw.turns_used === "number" ? raw.turns_used : 0,
  };
}

// Atomically increment the invite's turn counter. Returns the updated record,
// or null if the invite is out of budget (no write performed) or not found.
// Not truly atomic across processes — for POC scale this is fine; a real
// multi-instance deploy would need a KV INCR.
export async function consumeInviteTurn(
  token: string
): Promise<
  | { ok: true; invite: InviteRecord }
  | { ok: false; reason: "not_found" | "budget_exhausted"; invite?: InviteRecord }
> {
  const invite = await resolveInvite(token);
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.turns_used >= invite.turn_budget) {
    return { ok: false, reason: "budget_exhausted", invite };
  }
  const next: InviteRecord = { ...invite, turns_used: invite.turns_used + 1 };
  await writeInvite(next);
  return { ok: true, invite: next };
}

async function writeInvite(invite: InviteRecord): Promise<void> {
  if (process.env.VERCEL) {
    await hostedSaveInvite(invite);
    return;
  }
  await fs.mkdir(invitesDir(), { recursive: true });
  await fs.writeFile(invitePath(invite.token), JSON.stringify(invite, null, 2), "utf-8");
}

async function readInvite(token: string): Promise<InviteRecord | null> {
  if (process.env.VERCEL) return hostedGetInvite(token);
  try {
    const raw = await fs.readFile(invitePath(token), "utf-8");
    return JSON.parse(raw) as InviteRecord;
  } catch {
    return null;
  }
}
