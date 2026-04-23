import type { Round } from "./types";

// In-memory fallback for Vercel / hosted environments.
// State is per-process (shared within one warm Lambda instance).
// Sufficient for demo scale; won't survive cold starts or cross-instance requests.

const roundStore = new Map<string, Round>();
const sessionStore = new Map<string, unknown>();

export function hostedSaveRound(round: Round): void {
  roundStore.set(round.round_id, round);
}

export function hostedGetRound(id: string): Round | null {
  return roundStore.get(id) ?? null;
}

export function hostedListRounds(): Round[] {
  return [...roundStore.values()].sort((a, b) =>
    b.round_id.localeCompare(a.round_id)
  );
}

export function hostedSaveSession(id: string, payload: unknown): void {
  sessionStore.set(id, payload);
}

export function hostedGetSession(id: string): unknown | null {
  return sessionStore.get(id) ?? null;
}

export function hostedListSessions(): unknown[] {
  return [...sessionStore.values()];
}
