"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const [invitingBrief, setInvitingBrief] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, { url: string; token: string }>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // One-shot generator state. Migrated from /start (consolidated into /host on
  // Apr 25 — /start was unreachable from the front page and duplicated the
  // host-side brief-authoring path). Conversational Brief Designer is still
  // the primary path; this is the keyboard-first alternate.
  const [showGenerator, setShowGenerator] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<Template | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedBrief(null);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = (await res.json()) as { template?: Template; error?: string };
      if (!res.ok || !data.template) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGeneratedBrief(data.template);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleStartGenerated = () => {
    if (!generatedBrief) return;
    sessionStorage.setItem(
      `lacunex:brief:${generatedBrief.template_id}`,
      JSON.stringify(generatedBrief)
    );
    router.push(`/p/${generatedBrief.template_id}`);
  };

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

            {/* Brief Designer — peer card to the bundled briefs. Visually equal
                weight (rule border, surface bg) — only the glyph + CTA carry the
                thread accent. The earlier "alert" treatment was pulling attention
                away from the three primary briefs (Claude Designer review, Apr 25). */}
            <Link
              href={`/p/${BRIEF_DESIGNER.template_id}`}
              style={{
                background: aw.surface,
                border: `1px solid ${aw.rule}`,
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
                <Mono u s={9} c={aw.muted}>
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
                  color: aw.muted,
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

          {/* One-shot generator — keyboard-first alternative to the
              conversational Brief Designer. Collapsed by default to keep the
              briefs grid as the primary surface. */}
          <div style={{ marginTop: 26, borderTop: `1px solid ${aw.rule}`, paddingTop: 22 }}>
            <button
              type="button"
              onClick={() => setShowGenerator((v) => !v)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: aw.sans,
                color: aw.ink,
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                width: "100%",
                gap: 18,
                textAlign: "left",
              }}
            >
              <div>
                <Mono u s={9} c={aw.muted}>
                  quick generator · one-shot
                </Mono>
                <div
                  style={{
                    fontFamily: aw.serif,
                    fontSize: 17,
                    marginTop: 4,
                    letterSpacing: "-0.005em",
                  }}
                >
                  Skip the conversation — describe your use case and generate a brief.
                </div>
              </div>
              <Mono s={11} c={aw.muted2}>
                {showGenerator ? "hide" : "open"}
              </Mono>
            </button>

            {showGenerator && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One paragraph: who's the host, who's the participant, what are you trying to learn?"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: aw.surface,
                    border: `1px solid ${aw.rule}`,
                    fontFamily: aw.sans,
                    fontSize: 13,
                    color: aw.ink,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.55,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating || !description.trim()}
                  style={{
                    alignSelf: "flex-start",
                    padding: "10px 18px",
                    background: aw.ink,
                    color: aw.surface,
                    border: "none",
                    fontFamily: aw.mono,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: generating ? "wait" : "pointer",
                    opacity: !description.trim() ? 0.4 : 1,
                  }}
                >
                  {generating ? "generating · 15-30s" : "generate brief"}
                </button>
                {genError && (
                  <Mono s={11} c={aw.thread}>
                    {genError}
                  </Mono>
                )}
                {generatedBrief && (
                  <div
                    style={{
                      background: aw.surface,
                      border: `1px solid ${aw.rule}`,
                      padding: "14px 18px",
                      marginTop: 4,
                    }}
                  >
                    <Mono u s={9} c={aw.thread}>
                      brief generated
                    </Mono>
                    <div
                      style={{
                        fontFamily: aw.serif,
                        fontSize: 18,
                        letterSpacing: "-0.005em",
                        marginTop: 4,
                      }}
                    >
                      {generatedBrief.name}
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: aw.muted,
                        lineHeight: 1.55,
                        margin: "6px 0 12px",
                      }}
                    >
                      {generatedBrief.description}
                    </p>
                    <button
                      type="button"
                      onClick={handleStartGenerated}
                      style={{
                        padding: "9px 14px",
                        background: aw.thread,
                        color: aw.surface,
                        border: "none",
                        fontFamily: aw.mono,
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      try as participant →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
