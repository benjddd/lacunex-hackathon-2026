"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import briefDesignerTemplate from "@/templates/brief-designer.json";
import { DEFAULT_ROLE_LABELS, type Template } from "@/lib/types";
import { aw } from "@/components/convergence/tokens";
import { Wordmark, LogoGlyph } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";

const BRIEFS: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

const HOOKS: Record<string, string> = {
  "founder-product-ideation":
    "Walk me through the moment you realised you were solving a real problem — not a hypothesis, a moment.",
  "post-incident-witness":
    "Before we look at any reports — tell me what you personally saw or heard in the minutes before the incident.",
  "civic-consultation":
    "Forget the options on the table for a second. What outcome would make you feel this process was worth your time?",
};

const BRIEF_DESIGNER = briefDesignerTemplate as unknown as Template;

export default function StartPage() {
  const router = useRouter();
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
              start
            </Mono>
          </div>
          <Link href="/host" style={{ textDecoration: "none" }}>
            <Mono s={11} c={aw.muted}>
              host dashboard ↗
            </Mono>
          </Link>
        </div>
      </header>

      <main
        style={{
          maxWidth: 880,
          margin: "0 auto",
          width: "100%",
          padding: "48px 36px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <div>
          <Mono u s={10} c={aw.thread}>
            adaptive interviews · 15 minutes · both sides leave with something
          </Mono>
          <h1
            style={{
              fontFamily: aw.serif,
              fontSize: 42,
              fontWeight: 400,
              letterSpacing: "-0.015em",
              lineHeight: 1.05,
              margin: "12px 0 10px",
            }}
          >
            Pick a brief — or design your own.
          </h1>
          <p style={{ fontSize: 14, color: aw.muted, lineHeight: 1.65, maxWidth: 600 }}>
            Every question is decided turn by turn from what you say. There&apos;s no
            questionnaire. You leave with a reflective summary written for you.
          </p>
        </div>

        {/* Brief Designer — the meta-card, prominent at the top of the list. */}
        <Link
          href={`/p/${BRIEF_DESIGNER.template_id}`}
          style={{
            background: aw.threadSoft,
            border: `1px solid ${aw.thread}`,
            padding: "26px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            textDecoration: "none",
            color: aw.ink,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoGlyph size={22} variant="micro" />
            <Mono u s={9} c={aw.thread}>
              meta · the platform interviews you to author the brief
            </Mono>
          </div>
          <div
            style={{
              fontFamily: aw.serif,
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            {BRIEF_DESIGNER.name}
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: aw.ink2,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Tell the platform what you&apos;re trying to learn — your goals, your
            participants, your hypotheses. Same conductor, same cross-turn
            reasoning. The brief that runs your interview is built by the same
            engine that runs it.
          </p>
          <p
            style={{
              fontFamily: aw.serif,
              fontStyle: "italic",
              fontSize: 13.5,
              color: aw.thread,
              borderLeft: `2px solid ${aw.thread}`,
              paddingLeft: 12,
              margin: "4px 0 0",
            }}
          >
            &ldquo;What question are you trying to answer — and what decision will
            the answer inform?&rdquo;
          </p>
          <div style={{ marginTop: 6 }}>
            <Mono s={10} c={aw.thread}>
              <span style={{ borderBottom: `1px solid ${aw.thread}`, paddingBottom: 1 }}>
                design your brief →
              </span>
            </Mono>
          </div>
        </Link>

        {/* Or pick one of the bundled briefs */}
        <div>
          <Mono u s={10} c={aw.muted}>
            or pick a bundled brief
          </Mono>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {BRIEFS.map((brief) => {
              const roleLabels = brief.role_labels ?? DEFAULT_ROLE_LABELS;
              const hook = HOOKS[brief.template_id] ?? "";
              return (
                <div
                  key={brief.template_id}
                  style={{
                    background: aw.surface,
                    border: `1px solid ${aw.rule}`,
                    padding: "20px 24px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Mono u s={9} c={aw.muted}>
                      {roleLabels.host} · {roleLabels.participant}
                    </Mono>
                    <div
                      style={{
                        fontFamily: aw.serif,
                        fontSize: 20,
                        fontWeight: 400,
                        letterSpacing: "-0.01em",
                        marginTop: 4,
                        lineHeight: 1.2,
                      }}
                    >
                      {brief.name}
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: aw.muted,
                        lineHeight: 1.55,
                        margin: "8px 0 0",
                      }}
                    >
                      {brief.description}
                    </p>
                    {hook && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          paddingLeft: 12,
                          borderLeft: `2px solid ${aw.rule}`,
                          fontFamily: aw.serif,
                          fontStyle: "italic",
                          fontSize: 13,
                          color: aw.muted,
                          lineHeight: 1.5,
                        }}
                      >
                        &ldquo;{hook}&rdquo;
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/p/${brief.template_id}`}
                    style={{
                      padding: "10px 16px",
                      background: aw.ink,
                      color: aw.surface,
                      fontFamily: aw.mono,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    start as {roleLabels.participant.toLowerCase()}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick one-shot brief generator — kept for the keyboard-first path. */}
        <div style={{ borderTop: `1px solid ${aw.rule}`, paddingTop: 24 }}>
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
            }}
          >
            <div style={{ textAlign: "left" }}>
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
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
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
                    start as participant →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
