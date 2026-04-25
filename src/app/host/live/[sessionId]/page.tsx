"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DashboardPane } from "@/components/DashboardPane";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
import {
  type ExtractionState,
  type Template,
} from "@/lib/types";
import { aw } from "@/components/convergence/tokens";
import { Wordmark } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";

const TEMPLATE_MAP: Record<string, Template> = {
  [founderTemplate.template_id]: founderTemplate as unknown as Template,
  [postIncidentTemplate.template_id]: postIncidentTemplate as unknown as Template,
  [civicTemplate.template_id]: civicTemplate as unknown as Template,
  [briefDesignerTemplate.template_id]: briefDesignerTemplate as unknown as Template,
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

  // Live session ids look like "2026-04-25T09-19-31-699Z-live". Format the
  // timestamp portion human-readably for the header.
  const friendlyStarted = (() => {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(sessionId);
    if (!m) return sessionId.slice(0, 16);
    const [, ymd, hh, mm] = m;
    const d = new Date(`${ymd}T${hh}:${mm}:00Z`);
    if (Number.isNaN(d.getTime())) return ymd;
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  })();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: aw.bg,
        fontFamily: aw.sans,
        color: aw.ink,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "14px 28px",
          background: aw.surface,
          borderBottom: `1px solid ${aw.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0 }}>
          <Link href="/" style={{ textDecoration: "none" }} aria-label="Lacunex home">
            <Wordmark size={20} />
          </Link>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Mono u s={9} c={aw.muted}>
              live · watching session
            </Mono>
            <Mono s={11} c={aw.ink}>
              started {friendlyStarted}
            </Mono>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {liveState && (
            <Mono s={11} c={aw.muted}>
              turn {liveState.turn_count}
              {secondsSinceUpdate !== null && (
                <span style={{ color: aw.muted2 }}> · updated {secondsSinceUpdate}s ago</span>
              )}
            </Mono>
          )}
          <Link
            href="/host"
            style={{
              padding: "6px 12px",
              background: aw.surface,
              color: aw.ink,
              border: `1px solid ${aw.rule}`,
              fontFamily: aw.mono,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← back to host
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, overflow: "hidden" }}>
        {notStarted && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
            }}
          >
            <div style={{ maxWidth: 420, textAlign: "center" }}>
              <Mono u s={10} c={aw.muted}>
                no live data yet
              </Mono>
              <p
                style={{
                  marginTop: 10,
                  fontFamily: aw.serif,
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: aw.ink2,
                }}
              >
                Session not started yet or already ended — live data appears here when
                the participant is active.
              </p>
            </div>
          </div>
        )}

        {!notStarted && !liveState && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mono s={11} c={aw.muted}>
              waiting for first turn…
            </Mono>
          </div>
        )}

        {liveState && !template && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Mono s={11} c={aw.muted}>
              resolving template…
            </Mono>
          </div>
        )}

        {liveState && template && (
          <div style={{ height: "100%", overflow: "auto" }}>
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
