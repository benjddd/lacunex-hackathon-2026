"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import type { Round, Template } from "@/lib/types";

const TEMPLATES: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
};

export default function RoundsListPage() {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rounds");
      const data = (await res.json()) as { rounds?: Round[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRounds(data.rounds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          templateId: founderTemplate.template_id,
          label: label.trim(),
        }),
      });
      const data = (await res.json()) as { round?: Round; error?: string };
      if (!res.ok || !data.round) throw new Error(data.error ?? `HTTP ${res.status}`);
      setLabel("");
      setShowCreate(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              CaptainSubtext
            </h1>
            <p className="text-xs text-stone-500">Interview rounds</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/sessions"
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              All sessions
            </Link>
            <Link
              href="/"
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              New session
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-stone-600">
            A round is a cohort of interviews run against the same brief. The
            aggregate view shows cross-participant patterns the individual
            transcripts can&apos;t.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="shrink-0 rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-900"
          >
            {showCreate ? "Cancel" : "New round"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-stone-200 bg-white p-4">
            <label className="text-xs uppercase tracking-wider text-stone-500">
              Round label
            </label>
            <input
              autoFocus
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Q2 founder due-diligence cohort"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              disabled={creating}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-stone-500">
                Brief: {TEMPLATES[founderTemplate.template_id]?.name ?? founderTemplate.template_id}
              </p>
              <button
                type="submit"
                disabled={!label.trim() || creating}
                className="rounded-md bg-amber-600 px-4 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create round"}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!rounds && !error && (
          <p className="text-sm text-stone-500">Loading…</p>
        )}

        {rounds && rounds.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white px-6 py-8 text-center">
            <p className="text-sm text-stone-700">No rounds yet.</p>
            <p className="mt-2 text-xs text-stone-500">
              Create one above — then every session you save can be attached.
            </p>
          </div>
        )}

        {rounds && rounds.length > 0 && (
          <ul className="space-y-2">
            {rounds.map((r) => (
              <li key={r.round_id}>
                <Link
                  href={`/rounds/${r.round_id}`}
                  className="block rounded-lg border border-stone-200 bg-white px-5 py-4 transition hover:border-amber-300 hover:bg-amber-50/20"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {r.label}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {TEMPLATES[r.template_id]?.name ?? r.template_id}
                        {" · "}
                        {new Date(r.created_at).toLocaleString()}
                        {" · "}
                        {r.session_ids.length} session{r.session_ids.length === 1 ? "" : "s"}
                        {r.aggregate && (
                          <span className="ml-2 text-emerald-700">· aggregate ready</span>
                        )}
                        {r.status === "aggregating" && (
                          <span className="ml-2 text-amber-700">· aggregating…</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-stone-400">
                      {r.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
