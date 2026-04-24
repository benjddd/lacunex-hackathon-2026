"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";

const TEMPLATE_NAMES: Record<string, string> = {
  [founderTemplate.template_id]: founderTemplate.name,
  [postIncidentTemplate.template_id]: postIncidentTemplate.name,
  [civicTemplate.template_id]: civicTemplate.name,
  [briefDesignerTemplate.template_id]: briefDesignerTemplate.name,
};

interface SessionSummary {
  session_id: string;
  saved_at: string | null;
  template_id: string | null;
  turn_count: number;
  note: string | null;
  has_takeaway: boolean;
}

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/sessions");
        const data = (await res.json()) as {
          sessions?: SessionSummary[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (!cancelled) setSessions(data.sessions ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex
            </h1>
            <p className="text-xs text-stone-500">Past sessions</p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            New session
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!sessions && !error && (
          <p className="text-sm text-stone-500">Loading…</p>
        )}

        {sessions && sessions.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white px-6 py-8 text-center">
            <p className="text-sm text-stone-700">No saved sessions yet.</p>
            <p className="mt-2 text-xs text-stone-500">
              Sessions you save from the interview screen will appear here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-slate-800 px-4 py-1.5 text-xs text-white hover:bg-slate-900"
            >
              Start a session
            </Link>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.session_id}>
                <Link
                  href={`/sessions/${s.session_id}`}
                  className="block rounded-lg border border-stone-200 bg-white px-5 py-4 transition hover:border-amber-300 hover:bg-amber-50/20"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {s.template_id
                          ? (TEMPLATE_NAMES[s.template_id] ?? s.template_id)
                          : "(unknown brief)"}
                        {s.note && (
                          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone-600">
                            {s.note}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {s.saved_at ? new Date(s.saved_at).toLocaleString() : "—"} · {s.turn_count} turn
                        {s.turn_count === 1 ? "" : "s"}
                        {s.has_takeaway && (
                          <span className="ml-2 text-emerald-700">· reflection saved</span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-stone-400">
                      {s.session_id}
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
