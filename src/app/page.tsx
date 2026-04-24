"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Kept in sync with src/lib/invites.ts (server-side). Duplicated here so the
// client bundle doesn't pull in node:fs / node:crypto.
const TOKEN_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{16}$/;
const isValidToken = (s: string) => TOKEN_PATTERN.test(s);

export default function LandingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Paste the invite code or link you were given.");
      return;
    }
    // Accept either a raw 16-char token or a full /i/<token> URL.
    const match = trimmed.match(/\/i\/([1-9A-HJ-NP-Za-km-z]{16})/);
    const candidate = match ? match[1] : trimmed;
    if (!isValidToken(candidate)) {
      setError("That doesn't look like a valid invite code.");
      return;
    }
    router.push(`/i/${candidate}`);
  };

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex
            </h1>
            <p className="text-xs text-stone-500">
              Cross-turn reasoning, rendered live.
            </p>
          </div>
          <Link
            href="https://github.com/Attius-Digital-Art/lacunex"
            className="text-xs text-stone-500 hover:text-stone-700"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            Which are you here for?
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Lacunex is a platform for goal-directed adaptive interviews.
            Pick the path that fits.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Host */}
          <Link
            href="/host"
            className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-sm"
          >
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-sm font-semibold">
              H
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              I&apos;m running interviews
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Host hub — pick a brief, generate participant invite links, view
              rounds and cohort synthesis.
            </p>
            <p className="mt-3 text-xs font-medium text-amber-700 group-hover:text-amber-900">
              Open host hub →
            </p>
          </Link>

          {/* Participant */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold">
              P
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              I have an invite
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Paste the invite link or code your host sent you.
            </p>
            <form onSubmit={handleJoin} className="mt-3 space-y-2">
              <input
                type="text"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setError(null);
                }}
                placeholder="invite code or link"
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
              >
                Join interview
              </button>
              {error && <p className="text-[11px] text-red-700">{error}</p>}
            </form>
          </div>

          {/* Demo */}
          <Link
            href="/demo"
            className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm"
          >
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold">
              D
            </div>
            <h3 className="text-sm font-semibold text-stone-900">
              Just looking
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              See both sides in one window — participant chat on the left,
              host dashboard filling live on the right.
            </p>
            <p className="mt-3 text-xs font-medium text-slate-700 group-hover:text-slate-900">
              Open demo view →
            </p>
          </Link>
        </div>

        <div className="mt-10 text-center text-[11px] text-stone-500">
          Built for the Anthropic &quot;Built with Opus 4.7&quot; hackathon
          (April 2026). Open source — MIT.
        </div>
      </main>
    </div>
  );
}
