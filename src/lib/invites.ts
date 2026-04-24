import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import {
  hostedGetInvite,
  hostedSaveInvite,
  type InviteRecord,
} from "./store-hosted";

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
}): Promise<InviteRecord> {
  const invite: InviteRecord = {
    token: generateToken(),
    template_id: params.templateId,
    created_at: new Date().toISOString(),
    note: params.note ?? null,
  };
  if (process.env.VERCEL) {
    await hostedSaveInvite(invite);
    return invite;
  }
  await fs.mkdir(invitesDir(), { recursive: true });
  await fs.writeFile(invitePath(invite.token), JSON.stringify(invite, null, 2), "utf-8");
  return invite;
}

export async function resolveInvite(token: string): Promise<InviteRecord | null> {
  if (!isValidToken(token)) return null;
  if (process.env.VERCEL) return hostedGetInvite(token);
  try {
    const raw = await fs.readFile(invitePath(token), "utf-8");
    return JSON.parse(raw) as InviteRecord;
  } catch {
    return null;
  }
}
