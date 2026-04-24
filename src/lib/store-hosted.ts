import type { Round } from "./types";

// Hosted persistence layer for Vercel / serverless environments.
//
// When KV_REST_API_URL + KV_REST_API_TOKEN are set (Vercel KV provisioned),
// all data is durable in Upstash Redis. Falls back to in-process Map when
// those env vars are absent — sufficient for local preview and cold-start
// resilience, not cross-instance.
//
// KV layout:
//   round:{id}       → Round JSON
//   round_idx        → sorted set { member: roundId, score: created_at ms }
//   session:{id}     → SessionDoc JSON
//   session_idx      → sorted set { member: sessionId, score: saved_at ms }

const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const roundMem = new Map<string, Round>();
const sessionMem = new Map<string, unknown>();

// ---- KV helpers (lazy import so build doesn't fail when @vercel/kv unavailable) ----

async function kvGet<T>(key: string): Promise<T | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<T>(key);
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(key, value);
}

async function kvSetEx(key: string, value: unknown, ex: number): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(key, value, { ex });
}

async function kvZAdd(idxKey: string, score: number, member: string): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.zadd(idxKey, { score, member });
}

async function kvZRange(idxKey: string): Promise<string[]> {
  const { kv } = await import("@vercel/kv");
  const result = await kv.zrange<string[]>(idxKey, 0, -1, { rev: true });
  return result ?? [];
}

// ---- Round store ----

export async function hostedSaveRound(round: Round): Promise<void> {
  if (hasKV) {
    await kvSet(`round:${round.round_id}`, round);
    await kvZAdd("round_idx", new Date(round.created_at).getTime(), round.round_id);
  } else {
    roundMem.set(round.round_id, round);
  }
}

export async function hostedGetRound(id: string): Promise<Round | null> {
  if (hasKV) return kvGet<Round>(`round:${id}`);
  return roundMem.get(id) ?? null;
}

export async function hostedListRounds(): Promise<Round[]> {
  if (hasKV) {
    const ids = await kvZRange("round_idx");
    const rows = await Promise.all(ids.map((id) => hostedGetRound(id)));
    return rows.filter((r): r is Round => r !== null);
  }
  return [...roundMem.values()].sort((a, b) => b.round_id.localeCompare(a.round_id));
}

// ---- Session store ----

export async function hostedSaveSession(id: string, payload: unknown): Promise<void> {
  if (hasKV) {
    await kvSet(`session:${id}`, payload);
    await kvZAdd("session_idx", Date.now(), id);
  } else {
    sessionMem.set(id, payload);
  }
}

export async function hostedGetSession(id: string): Promise<unknown | null> {
  if (hasKV) return kvGet(`session:${id}`);
  return sessionMem.get(id) ?? null;
}

export async function hostedListSessions(): Promise<unknown[]> {
  if (hasKV) {
    const ids = await kvZRange("session_idx");
    const rows = await Promise.all(ids.map((id) => hostedGetSession(id)));
    return rows.filter((r) => r !== null);
  }
  return [...sessionMem.values()];
}

// ---- Takeaway store ----

const takeawayMem = new Map<string, string>();

export async function hostedGetTakeaway(sessionId: string): Promise<string | null> {
  if (hasKV) return kvGet<string>(`takeaway:${sessionId}`);
  return takeawayMem.get(sessionId) ?? null;
}

export async function hostedSaveTakeaway(sessionId: string, markdown: string): Promise<void> {
  if (hasKV) {
    await kvSet(`takeaway:${sessionId}`, markdown);
  } else {
    takeawayMem.set(sessionId, markdown);
  }
}

// ---- Research (claim verification) store ----

const researchMem = new Map<string, string>();

export async function hostedGetResearch(sessionId: string): Promise<string | null> {
  if (hasKV) return kvGet<string>(`research:${sessionId}`);
  return researchMem.get(sessionId) ?? null;
}

export async function hostedSaveResearch(sessionId: string, report: string): Promise<void> {
  if (hasKV) {
    await kvSet(`research:${sessionId}`, report);
  } else {
    researchMem.set(sessionId, report);
  }
}

// ---- Invite store ----

export interface InviteRecord {
  token: string;
  template_id: string;
  created_at: string;
  note: string | null;
  // Per-invite turn budget (Layer 3 of credit-burn protection). When a
  // request to /api/turn carries this invite's token, the server rejects
  // once `turns_used >= turn_budget`, independent of per-IP rate limits.
  turn_budget: number;
  turns_used: number;
}

const inviteMem = new Map<string, InviteRecord>();

export async function hostedSaveInvite(invite: InviteRecord): Promise<void> {
  if (hasKV) {
    await kvSet(`invite:${invite.token}`, invite);
  } else {
    inviteMem.set(invite.token, invite);
  }
}

export async function hostedGetInvite(token: string): Promise<InviteRecord | null> {
  if (hasKV) return kvGet<InviteRecord>(`invite:${token}`);
  return inviteMem.get(token) ?? null;
}

// ---- Live session store (2h TTL) ----

const liveSessionMem = new Map<string, unknown>();

export async function hostedSaveLiveSession(sessionId: string, state: unknown): Promise<void> {
  if (hasKV) {
    await kvSetEx(`live:${sessionId}`, state, 7200);
  } else {
    liveSessionMem.set(sessionId, state);
  }
}

export async function hostedGetLiveSession(sessionId: string): Promise<unknown | null> {
  if (hasKV) return kvGet(`live:${sessionId}`);
  return liveSessionMem.get(sessionId) ?? null;
}
