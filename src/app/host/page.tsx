"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
import { DEFAULT_ROLE_LABELS, type Round, type Template } from "@/lib/types";
import { aw } from "@/components/convergence/tokens";
import { Wordmark, LogoGlyph } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";

const AVAILABLE_BRIEFS: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

const BRIEF_DESIGNER = briefDesignerTemplate as unknown as Template;

export default function HostPage() {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const [invitingBrief, setInvitingBrief] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, { url: string; token: string }>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const createInvite = async (templateId: string) => {
    setInvitingBrief(templateId);
    setInviteError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = (await res.json()) as {
        invite?: { token: string; template_id: string };
        error?: string;
      };
      if (!res.ok || !data.invite) throw new Error(data.error ?? `HTTP ${res.status}`);
      const url = `${window.location.origin}/i/${data.invite.token}`;
      setInvites((prev) => ({
        ...prev,
        [templateId]: { url, token: data.invite!.token },
      }));
      try {
        await navigator.clipboard.writeText(url);
        setCopied(templateId);
        setTimeout(() => setCopied((c) => (c === templateId ? null : c)), 2000);
      } catch {
        /* clipboard may be blocked; URL still visible */
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : String(err));
    } finally {
      setInvitingBrief(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rounds");
        const data = (await res.json()) as {
          rounds?: Round[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (!cancelled) setRounds(data.rounds ?? []);
      } catch (err) {
        if (!cancelled) setRoundsError(err instanceof Error ? err.message : String(err));
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
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ textDecoration: "none" }} aria-label="Lacunex home">
              <Wordmark size={20} />
            </Link>
            <Mono s={11} c={aw.muted} u>
              host
            </Mono>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Link href="/sessions" style={{ textDecoration: "none" }}>
              <Mono s={11} c={aw.muted}>
                past sessions
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
          maxWidth: 1080,
          margin: "0 auto",
          width: "100%",
          padding: "40px 36px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        {/* Run a session */}
        <section>
          <Mono u s={10} c={aw.muted}>
            run a session
          </Mono>
          <div
            style={{
              fontFamily: aw.serif,
              fontSize: 30,
              fontWeight: 400,
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
              marginTop: 6,
            }}
          >
            Pick a brief — or design your own.
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: aw.muted,
              marginTop: 8,
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            Open the combined view to drive both sides yourself, or generate an invite
            link the participant opens in their own browser.
          </p>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gap: 18,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            }}
          >
            {AVAILABLE_BRIEFS.map((t) => {
              const roleLabels = t.role_labels ?? DEFAULT_ROLE_LABELS;
              const invite = invites[t.template_id];
              return (
                <div
                  key={t.template_id}
                  style={{
                    background: aw.surface,
                    border: `1px solid ${aw.rule}`,
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <LogoGlyph size={18} variant="default" />
                    <Mono u s={9} c={aw.muted}>
                      {roleLabels.host} · {roleLabels.participant}
                    </Mono>
                  </div>
                  <div
                    style={{
                      fontFamily: aw.serif,
                      fontSize: 19,
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      lineHeight: 1.2,
                    }}
                  >
                    {t.name}
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: aw.muted,
                      lineHeight: 1.55,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {t.description}
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <Link
                      href={`/demo?brief=${t.template_id}`}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "9px 10px",
                        background: aw.ink,
                        color: aw.surface,
                        fontFamily: aw.mono,
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        textDecoration: "none",
                      }}
                    >
                      combined view
                    </Link>
                    <button
                      type="button"
                      onClick={() => createInvite(t.template_id)}
                      disabled={invitingBrief === t.template_id}
                      style={{
                        flex: 1,
                        padding: "9px 10px",
                        background: aw.surface,
                        color: aw.ink,
                        border: `1px solid ${aw.rule}`,
                        fontFamily: aw.mono,
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: invitingBrief === t.template_id ? "wait" : "pointer",
                      }}
                    >
                      {invitingBrief === t.template_id
                        ? "creating…"
                        : copied === t.template_id
                          ? "copied ✓"
                          : invite
                            ? "new invite"
                            : "invite link"}
                    </button>
                  </div>
                  {invite && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: "8px 10px",
                        background: aw.threadSoft,
                        border: `1px solid ${aw.thread}`,
                      }}
                    >
                      <Mono u s={9} c={aw.thread}>
                        share with participant
                      </Mono>
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <code
                          style={{
                            flex: 1,
                            background: aw.surface,
                            border: `1px solid ${aw.rule}`,
                            padding: "5px 8px",
                            fontFamily: aw.mono,
                            fontSize: 11,
                            color: aw.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            userSelect: "all",
                          }}
                        >
                          {invite.url}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(invite.url);
                            setCopied(t.template_id);
                            setTimeout(
                              () =>
                                setCopied((c) => (c === t.template_id ? null : c)),
                              2000
                            );
                          }}
                          style={{
                            background: aw.surface,
                            border: `1px solid ${aw.rule}`,
                            padding: "5px 8px",
                            fontFamily: aw.mono,
                            fontSize: 9,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: aw.ink,
                            cursor: "pointer",
                          }}
                        >
                          {copied === t.template_id ? "✓" : "copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Brief Designer — same card grid, marked with thread accent so it
                reads as a peer of the bundled briefs, not an afterthought. */}
            <Link
              href={`/p/${BRIEF_DESIGNER.template_id}`}
              style={{
                background: aw.threadSoft,
                border: `1px solid ${aw.thread}`,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textDecoration: "none",
                color: aw.ink,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LogoGlyph size={18} variant="micro" />
                <Mono u s={9} c={aw.thread}>
                  meta · author your own brief
                </Mono>
              </div>
              <div
                style={{
                  fontFamily: aw.serif,
                  fontSize: 19,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {BRIEF_DESIGNER.name}
              </div>
              <p
                style={{
                  fontSize: 12.5,
                  color: aw.ink2,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Tell the platform what you&apos;re trying to learn — it interviews you to
                build the brief, then the brief runs against your participants. Same
                four-call architecture, recursive.
              </p>
              <div style={{ marginTop: "auto", paddingTop: 6 }}>
                <Mono s={10} c={aw.thread}>
                  <span style={{ borderBottom: `1px solid ${aw.thread}`, paddingBottom: 1 }}>
                    design your brief →
                  </span>
                </Mono>
              </div>
            </Link>
          </div>

          {inviteError && (
            <div style={{ marginTop: 12 }}>
              <Mono s={11} c={aw.thread}>
                Couldn&apos;t create invite: {inviteError}
              </Mono>
            </div>
          )}
        </section>

        {/* Rounds */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Mono u s={10} c={aw.muted}>
              rounds · cross-participant aggregates
            </Mono>
            <Link href="/rounds" style={{ textDecoration: "none" }}>
              <Mono s={10} c={aw.thread}>
                <span style={{ borderBottom: `1px solid ${aw.thread}`, paddingBottom: 1 }}>
                  all rounds →
                </span>
              </Mono>
            </Link>
          </div>

          {roundsError && (
            <Mono s={11} c={aw.thread}>
              {roundsError}
            </Mono>
          )}
          {!rounds && !roundsError && (
            <Mono s={11} c={aw.muted}>
              loading…
            </Mono>
          )}
          {rounds && rounds.length === 0 && (
            <div
              style={{
                background: aw.surface,
                border: `1px solid ${aw.rule}`,
                padding: "16px 22px",
              }}
            >
              <Mono s={12} c={aw.muted}>
                No rounds yet. <Link href="/rounds" style={{ color: aw.thread }}>Create one →</Link>
              </Mono>
            </div>
          )}
          {rounds && rounds.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rounds.slice(0, 5).map((r) => (
                <Link
                  key={r.round_id}
                  href={`/rounds/${r.round_id}`}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    background: aw.surface,
                    border: `1px solid ${aw.rule}`,
                    padding: "12px 18px",
                    textDecoration: "none",
                    color: aw.ink,
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontFamily: aw.serif,
                        fontSize: 15,
                        letterSpacing: "-0.005em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {r.label}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Mono s={10} c={aw.muted2}>
                        {r.session_ids.length} session{r.session_ids.length === 1 ? "" : "s"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {r.aggregate ? " · aggregate ready" : ""}
                      </Mono>
                    </div>
                  </div>
                  <Mono s={9} c={r.aggregate ? aw.thread : aw.muted2} u>
                    {r.status ?? "open"}
                  </Mono>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
