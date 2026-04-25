"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
import { aw } from "@/components/convergence/tokens";
import { Wordmark } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";

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
          padding: "14px 36px",
          background: aw.surface,
          borderBottom: `1px solid ${aw.rule}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none" }} aria-label="Lacunex home">
              <Wordmark size={20} />
            </Link>
            <Mono s={11} c={aw.muted} u>
              past sessions
            </Mono>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/host" style={{ textDecoration: "none" }}>
              <Mono s={11} c={aw.muted}>
                host
              </Mono>
            </Link>
            <Link href="/rounds" style={{ textDecoration: "none" }}>
              <Mono s={11} c={aw.muted}>
                rounds
              </Mono>
            </Link>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 880,
          margin: "0 auto",
          width: "100%",
          padding: "40px 36px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {error && (
          <div
            style={{
              padding: "12px 18px",
              background: aw.threadSoft,
              border: `1px solid ${aw.thread}`,
            }}
          >
            <Mono s={11} c={aw.thread}>
              {error}
            </Mono>
          </div>
        )}

        {!sessions && !error && (
          <Mono s={11} c={aw.muted}>
            loading…
          </Mono>
        )}

        {sessions && sessions.length === 0 && (
          <div
            style={{
              background: aw.surface,
              border: `1px solid ${aw.rule}`,
              padding: "28px 26px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: aw.serif,
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginBottom: 6,
              }}
            >
              No saved sessions yet.
            </div>
            <p style={{ fontSize: 13, color: aw.muted, lineHeight: 1.55, margin: "0 auto", maxWidth: 460 }}>
              Sessions saved from the participant view appear here. Open a brief on
              the host hub or run the demo view to create one.
            </p>
            <div style={{ marginTop: 14, display: "inline-flex", gap: 10 }}>
              <Link
                href="/host"
                style={{
                  padding: "9px 14px",
                  background: aw.ink,
                  color: aw.surface,
                  fontFamily: aw.mono,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                }}
              >
                open host hub
              </Link>
              <Link
                href="/demo"
                style={{
                  padding: "9px 14px",
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
                open demo view
              </Link>
            </div>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <>
            <Mono u s={10} c={aw.muted}>
              {sessions.length} session{sessions.length === 1 ? "" : "s"} · most recent first
            </Mono>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.map((s) => {
                const briefName = s.template_id
                  ? (TEMPLATE_NAMES[s.template_id] ?? s.template_id)
                  : "(unknown brief)";
                return (
                  <Link
                    key={s.session_id}
                    href={`/sessions/${s.session_id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "baseline",
                      gap: 18,
                      background: aw.surface,
                      border: `1px solid ${aw.rule}`,
                      padding: "14px 20px",
                      textDecoration: "none",
                      color: aw.ink,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: aw.serif,
                          fontSize: 16,
                          letterSpacing: "-0.005em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {briefName}
                        {s.note && (
                          <span
                            style={{
                              marginLeft: 10,
                              padding: "2px 8px",
                              background: aw.bg,
                              border: `1px solid ${aw.rule2}`,
                              fontFamily: aw.mono,
                              fontSize: 9,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: aw.muted,
                              verticalAlign: 2,
                            }}
                          >
                            {s.note}
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 3 }}>
                        <Mono s={10} c={aw.muted2}>
                          {s.saved_at
                            ? new Date(s.saved_at).toLocaleString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                          {" · "}
                          {s.turn_count} turn{s.turn_count === 1 ? "" : "s"}
                          {s.has_takeaway && (
                            <span style={{ color: aw.thread }}> · reflection saved</span>
                          )}
                        </Mono>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
