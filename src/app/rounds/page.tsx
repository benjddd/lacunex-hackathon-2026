"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import type { Round, Template } from "@/lib/types";
import { aw } from "@/components/convergence/tokens";
import { Wordmark } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";
import { formatDateTime } from "@/lib/format";

const TEMPLATES: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
  [postIncidentTemplate.template_id]: postIncidentTemplate as unknown as Template,
  [civicTemplate.template_id]: civicTemplate as unknown as Template,
};

const TEMPLATE_LIST = Object.values(TEMPLATES);

export default function RoundsListPage() {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(founderTemplate.template_id);
  const [targetCount, setTargetCount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createdRound, setCreatedRound] = useState<Round | null>(null);

  const cloneFromRound = (r: Round) => {
    setSelectedTemplateId(r.template_id);
    setTargetCount(r.target_participant_count ? String(r.target_participant_count) : "");
    setTargetDate(r.target_date ?? "");
    setLabel(`${r.label} (copy)`);
    setCreatedRound(null);
    setShowCreate(true);
  };

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
    // load() runs a fetch and commits the result via setState. React 19's
    // set-state-in-effect rule flags this; the pattern is the canonical
    // way to hydrate a client component from a REST endpoint and is safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          templateId: selectedTemplateId,
          label: label.trim(),
          targetParticipantCount: targetCount ? parseInt(targetCount, 10) : null,
          targetDate: targetDate || null,
        }),
      });
      const data = (await res.json()) as { round?: Round; error?: string };
      if (!res.ok || !data.round) throw new Error(data.error ?? `HTTP ${res.status}`);
      setLabel("");
      setCreatedRound(data.round);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: aw.bg, fontFamily: aw.sans, color: aw.ink }}>
      <header
        style={{
          padding: "14px 28px",
          background: aw.surface,
          borderBottom: `1px solid ${aw.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Lacunex home">
            <Wordmark size={20} />
          </Link>
          <Mono s={11} c={aw.muted} u>
            rounds
          </Mono>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Link href="/host" style={{ textDecoration: "none" }}>
            <Mono s={11} c={aw.muted}>
              host
            </Mono>
          </Link>
          <Link href="/sessions" style={{ textDecoration: "none" }}>
            <Mono s={11} c={aw.muted}>
              sessions
            </Mono>
          </Link>
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
            onClick={() => { setShowCreate((v) => !v); setCreatedRound(null); }}
            className="shrink-0 rounded-md bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-900"
          >
            {showCreate || createdRound ? "Cancel" : "New round"}
          </button>
        </div>

        {showCreate && !createdRound && (
          <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-stone-200 bg-white p-4 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-500">Brief</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={creating}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                {TEMPLATE_LIST.map((t) => (
                  <option key={t.template_id} value={t.template_id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-stone-500">Round label</label>
              <input
                autoFocus
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Q2 founder due-diligence cohort"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                disabled={creating}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500">Target participants (optional)</label>
                <input
                  type="number"
                  min={1}
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500">Target close date (optional)</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="flex justify-end">
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

        {createdRound && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-xs font-medium text-emerald-800">Round created — share this link with participants:</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-xs text-stone-800 border border-stone-200 select-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/p/{createdRound.template_id}?round={createdRound.round_id}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/p/${createdRound.template_id}?round=${createdRound.round_id}`
                  );
                }}
                className="shrink-0 rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
              >
                Copy
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Link
                href={`/rounds/${createdRound.round_id}`}
                className="text-xs text-amber-700 underline hover:text-amber-900"
              >
                View round →
              </Link>
              <button
                type="button"
                onClick={() => { setCreatedRound(null); setShowCreate(true); }}
                className="text-xs text-stone-500 underline hover:text-stone-700"
              >
                Create another
              </button>
            </div>
          </div>
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
              <li key={r.round_id} className="flex items-stretch gap-2">
                <Link
                  href={`/rounds/${r.round_id}`}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-5 py-4 transition hover:border-amber-300 hover:bg-amber-50/20"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {r.label}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {TEMPLATES[r.template_id]?.name ?? r.template_id}
                        {" · "}
                        {formatDateTime(r.created_at)}
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
                <button
                  type="button"
                  onClick={() => cloneFromRound(r)}
                  title="Use as template for a new round"
                  className="shrink-0 self-center rounded-md border border-stone-200 bg-white px-2 py-1 text-[10px] text-stone-500 hover:border-amber-300 hover:text-amber-800"
                >
                  ⎘ clone
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
