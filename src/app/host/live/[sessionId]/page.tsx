"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardPane } from "@/components/DashboardPane";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import {
  type ExtractionState,
  type Template,
} from "@/lib/types";

const TEMPLATE_MAP: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
  [postIncidentTemplate.template_id]: postIncidentTemplate as unknown as Template,
  [civicTemplate.template_id]: civicTemplate as unknown as Template,
};

interface LiveState {
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  turn_count: number;
  updated_at: string;
  template_id?: string;
}

export default function LiveHostPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [notStarted, setNotStarted] = useState(false);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null);

  // Lazy-init via useState so we capture a mount-time timestamp without
  // calling Date.now() during render (flagged by react-compiler). We read
  // but never setState on this — it's a stable sentinel for timeout logic.
  const [firstFetchAt] = useState<number>(() => Date.now());
  const lastUpdatedAt = useRef<string | null>(null);

  // Try to resolve the template: check live state's template_id, or
  // fall back to fetching the saved session.
  const resolveTemplate = (templateId: string | undefined) => {
    if (templateId && TEMPLATE_MAP[templateId]) {
      setTemplate(TEMPLATE_MAP[templateId]);
      return;
    }
  };

  // Poll live state every 4 seconds.
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/live`
        );
        if (cancelled) return;
        if (res.status === 404) {
          const elapsed = (Date.now() - firstFetchAt) / 1000;
          if (elapsed > 10) {
            setNotStarted(true);
          }
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as LiveState;
        if (cancelled) return;
        setLiveState(data);
        setNotStarted(false);
        lastUpdatedAt.current = data.updated_at;
        // Resolve template from live state if possible.
        if (data.template_id) resolveTemplate(data.template_id);
      } catch {
        // non-fatal
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, firstFetchAt]);

  // Update "seconds ago" every second.
  useEffect(() => {
    const tick = () => {
      if (lastUpdatedAt.current) {
        const diff = Math.round(
          (Date.now() - new Date(lastUpdatedAt.current).getTime()) / 1000
        );
        setSecondsSinceUpdate(diff);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const shortId = sessionId.replace(/-live$/, "").slice(0, 23);

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-stone-200 bg-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-stone-500 uppercase tracking-wider">
            Live — watching session
          </p>
          <h1 className="mt-0.5 text-sm font-mono text-stone-700 truncate">
            {shortId}&hellip;
          </h1>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {liveState && (
            <span className="text-xs text-stone-500 tabular-nums">
              Turn {liveState.turn_count}
              {secondsSinceUpdate !== null && (
                <span className="ml-2 text-stone-400">
                  · updated {secondsSinceUpdate}s ago
                </span>
              )}
            </span>
          )}
          <Link
            href="/host"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Back to host
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-hidden">
        {notStarted && (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-sm text-center text-sm text-stone-500 leading-relaxed">
              Session not started yet or already ended — live data appears here
              when the participant is active.
            </p>
          </div>
        )}

        {!notStarted && !liveState && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-stone-400 animate-pulse">
              Waiting for first turn data…
            </p>
          </div>
        )}

        {liveState && !template && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-stone-400 animate-pulse">
              Resolving template…
            </p>
          </div>
        )}

        {liveState && template && (
          <div className="h-full overflow-auto">
            <DashboardPane
              template={template}
              extraction={liveState.extraction}
              activeObjectiveId={liveState.activeObjectiveId}
            />
          </div>
        )}
      </main>
    </div>
  );
}
