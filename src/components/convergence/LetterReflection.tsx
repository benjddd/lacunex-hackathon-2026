"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { aw } from "./tokens";
import { Mono } from "./Mono";

interface LetterReflectionProps {
  markdown: string;
  // "final" — session is closed, actions in header, "yours to keep" framing.
  // "peek" — mid-session, "conversation paused" header, draft pip, return CTA.
  mode?: "final" | "peek";
  // Optional metadata that decorates the letter header. All optional —
  // the letter renders cleanly without any of them.
  hostName?: string; // "Maya Thornton"
  hostRole?: string; // "borough planning"
  turnCount?: number;
  totalEstimatedTurns?: number; // shown in peek header as "turn N of ~M"
  lastRefreshedTurn?: number; // shown in peek subtitle
  startedAt?: string; // ISO date
  // Final-mode actions. Missing ones hide.
  onSavePdf?: () => void;
  onEmail?: () => void;
  // Peek-mode action. Required to exit the takeover and return to the chat.
  onReturnToConversation?: () => void;
}

interface LetterSection {
  // The id of the section inferred from the heading text (lowercased,
  // non-alpha → underscore). Lets us special-case `what_surfaced` etc.
  id: string;
  heading: string;
  body: string;
}

// Parse a reflection markdown into ordered sections by `### Heading`.
// Anything before the first `###` is treated as the opening preamble.
function parseSections(markdown: string): { preamble: string; sections: LetterSection[] } {
  const lines = markdown.split(/\r?\n/);
  const sections: LetterSection[] = [];
  const preambleLines: string[] = [];
  let current: LetterSection | null = null;

  for (const line of lines) {
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) {
      if (current) sections.push(current);
      const heading = h3[1].trim();
      const id = heading
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      current = { id, heading, body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    } else {
      preambleLines.push(line);
    }
  }
  if (current) sections.push(current);

  // The H1 line ("## Lacunex — your reflection") is part of preamble; strip
  // it. Keep the dateline / one-line opener if present.
  const preambleText = preambleLines
    .filter((l) => !/^##\s+/.test(l))
    .join("\n")
    .trim();

  return { preamble: preambleText, sections };
}

export function LetterReflection({
  markdown,
  mode = "final",
  hostName,
  hostRole,
  turnCount,
  totalEstimatedTurns,
  lastRefreshedTurn,
  startedAt,
  onSavePdf,
  onEmail,
  onReturnToConversation,
}: LetterReflectionProps) {
  const isPeek = mode === "peek";
  const { preamble, sections } = useMemo(() => parseSections(markdown), [markdown]);

  // Pick a "highlight" section — the one whose heading suggests the
  // cross-turn surfacing moment. This gets the thread-coloured pip.
  const surfacedSectionId = useMemo(() => {
    const candidates = ["what_surfaced", "what_surfaced_between_the_lines", "what_surfaced_in_this_conversation"];
    for (const c of candidates) {
      if (sections.some((s) => s.id === c)) return c;
    }
    // Fallback: any section whose id contains "surface".
    return sections.find((s) => s.id.includes("surface"))?.id ?? null;
  }, [sections]);

  const date = startedAt ? new Date(startedAt) : new Date();
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        height: "100%",
        background: aw.surface,
        fontFamily: aw.sans,
        color: aw.ink,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header bar — different in peek vs final */}
      {isPeek ? (
        <div
          style={{
            padding: "12px 24px",
            background: aw.threadSoft,
            borderBottom: `1px solid ${aw.thread}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Mono u s={10} c={aw.thread}>
            conversation paused
            {turnCount && totalEstimatedTurns
              ? ` · turn ${turnCount} of ~${totalEstimatedTurns}`
              : turnCount
                ? ` · turn ${turnCount}`
                : ""}
          </Mono>
          <div style={{ marginLeft: "auto" }}>
            {onReturnToConversation && (
              <button
                type="button"
                onClick={onReturnToConversation}
                style={{
                  fontFamily: aw.mono,
                  fontSize: 10,
                  padding: "7px 14px",
                  background: aw.ink,
                  color: aw.surface,
                  border: "none",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                ← return to the conversation
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "14px 28px",
            borderBottom: `1px solid ${aw.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: aw.sans,
              fontWeight: 500,
              fontSize: 16,
              letterSpacing: "-0.02em",
              color: aw.ink,
            }}
          >
            lacunex
          </div>
          <Mono u s={9} c={aw.muted}>
            your reflection · ready
          </Mono>
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
            {onSavePdf && (
              <button
                type="button"
                onClick={onSavePdf}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Mono s={9} c={aw.muted}>
                  <span style={{ borderBottom: `1px solid ${aw.muted}`, paddingBottom: 1 }}>
                    save pdf
                  </span>
                </Mono>
              </button>
            )}
            {onEmail && (
              <button
                type="button"
                onClick={onEmail}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Mono s={9} c={aw.muted}>
                  <span style={{ borderBottom: `1px solid ${aw.muted}`, paddingBottom: 1 }}>
                    email me a copy
                  </span>
                </Mono>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Letter body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "40px 0 60px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 620,
            width: "100%",
            padding: "0 40px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* Letter-style opening */}
          <div style={{ paddingBottom: 6 }}>
            {isPeek ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Mono u s={10} c={aw.muted}>
                  your reflection · in progress
                </Mono>
                <DraftPip />
              </div>
            ) : (
              (hostName || hostRole) && (
                <Mono u s={10} c={aw.thread}>
                  {[hostName, hostRole].filter(Boolean).join(" · ")}
                </Mono>
              )
            )}
            <div
              style={{
                fontFamily: aw.serif,
                fontSize: isPeek ? 32 : 36,
                fontWeight: 400,
                marginTop: hostName || isPeek ? 10 : 0,
                lineHeight: 1.05,
                letterSpacing: "-0.015em",
                color: aw.ink,
              }}
            >
              {isPeek
                ? "What this conversation is starting to surface."
                : "Thank you for the conversation."}
            </div>
            <div style={{ marginTop: 6 }}>
              <Mono s={10} c={aw.muted}>
                {isPeek
                  ? [
                      turnCount ? `${turnCount} turns so far` : null,
                      "still being written",
                      lastRefreshedTurn ? `refreshed at turn ${lastRefreshedTurn}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : [dateLabel, turnCount ? `${turnCount} turns` : null]
                      .filter(Boolean)
                      .join(" · ")}
              </Mono>
            </div>
          </div>

          {preamble && (
            <p
              style={{
                margin: 0,
                fontSize: 15.5,
                lineHeight: 1.7,
                color: aw.ink2,
                fontFamily: aw.serif,
              }}
            >
              {preamble.replace(/^\*|\*$/g, "").trim()}
            </p>
          )}

          {sections.map((s) => (
            <SectionBlock
              key={s.id}
              section={s}
              isSurfaced={s.id === surfacedSectionId}
            />
          ))}

          {isPeek ? (
            <>
              <div
                style={{
                  padding: "14px 18px",
                  background: aw.threadSoft,
                  border: `1px solid ${aw.thread}`,
                  marginTop: 8,
                }}
              >
                <Mono u s={9} c={aw.thread}>
                  this is a draft
                </Mono>
                <div
                  style={{
                    fontSize: 12.5,
                    color: aw.ink2,
                    marginTop: 6,
                    lineHeight: 1.55,
                    fontFamily: aw.sans,
                  }}
                >
                  Your reflection grows with each turn. The final version will be
                  more complete — this is what&apos;s surfacing so far.
                </div>
              </div>
              {onReturnToConversation && (
                <button
                  type="button"
                  onClick={onReturnToConversation}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "14px 18px",
                    fontFamily: aw.mono,
                    fontSize: 11,
                    background: aw.ink,
                    color: aw.surface,
                    border: "none",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  ← return to the conversation
                </button>
              )}
              <div style={{ textAlign: "center", marginTop: 4 }}>
                <Mono s={9} c={aw.muted2}>
                  {turnCount
                    ? `you were on turn ${turnCount} — we'll pick up exactly there`
                    : "we'll pick up where you left off"}
                </Mono>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  paddingTop: 14,
                  fontFamily: aw.serif,
                  fontSize: 14,
                  fontStyle: "italic",
                  color: aw.muted,
                }}
              >
                — {hostName ?? "Lacunex"}
              </div>
              <div style={{ textAlign: "center", marginTop: 28 }}>
                <a
                  href="/"
                  style={{
                    fontFamily: aw.mono,
                    fontSize: 10,
                    color: aw.muted,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                    borderBottom: `1px solid ${aw.rule}`,
                    paddingBottom: 1,
                  }}
                >
                  ← back to lacunex
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Pulsing thread-coloured dot + DRAFT label, used in peek-mode header.
function DraftPip() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <style>{`
        @keyframes lacunex-draftpip-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.9); }
        }
      `}</style>
      <span
        style={{
          width: 6,
          height: 6,
          background: aw.thread,
          borderRadius: "50%",
          animation: "lacunex-draftpip-pulse 1.4s ease-in-out infinite",
        }}
      />
      <Mono u s={9} c={aw.thread}>
        draft
      </Mono>
    </span>
  );
}

function SectionBlock({
  section,
  isSurfaced,
}: {
  section: LetterSection;
  isSurfaced: boolean;
}) {
  const isQuestion = section.id.includes("question") || section.id.includes("open");
  const isAlreadyHave = section.id.includes("already_have");

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {isSurfaced && (
          <div
            style={{
              width: 6,
              height: 6,
              background: aw.thread,
              borderRadius: "50%",
            }}
          />
        )}
        <Mono u s={10} c={isSurfaced ? aw.thread : aw.muted}>
          {section.heading}
        </Mono>
      </div>
      {isAlreadyHave ? (
        // The "what you already have" section often contains a list. Render
        // any markdown list normally, but in italic-serif body for the
        // letter feel.
        <div
          style={{
            fontFamily: aw.sans,
            fontSize: 13.5,
            color: aw.ink2,
            lineHeight: 1.65,
          }}
        >
          <SectionMarkdown body={section.body} />
        </div>
      ) : isSurfaced ? (
        <div
          style={{
            fontFamily: aw.serif,
            fontSize: 17,
            fontStyle: "italic",
            lineHeight: 1.55,
            color: aw.ink,
          }}
        >
          <SectionMarkdown body={section.body} />
        </div>
      ) : isQuestion ? (
        <div
          style={{
            fontFamily: aw.serif,
            fontSize: 18,
            fontStyle: "italic",
            lineHeight: 1.5,
            color: aw.ink,
            marginTop: 8,
          }}
        >
          <SectionMarkdown body={section.body} />
        </div>
      ) : (
        <div
          style={{
            fontFamily: aw.serif,
            fontSize: 14.5,
            lineHeight: 1.65,
            color: aw.ink2,
            marginTop: 8,
          }}
        >
          <SectionMarkdown body={section.body} />
        </div>
      )}
    </section>
  );
}

function SectionMarkdown({ body }: { body: string }) {
  // Render the body as markdown but strip the surrounding asterisks/quotes
  // ReactMarkdown doesn't trim, and let any list / strong / em flow through.
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p style={{ margin: "0 0 10px 0" }}>{children}</p>
        ),
        em: ({ children }) => <em style={{ color: aw.ink }}>{children}</em>,
        strong: ({ children }) => (
          <strong style={{ color: aw.ink, fontWeight: 600 }}>{children}</strong>
        ),
        ul: ({ children }) => (
          <ul style={{ margin: "6px 0 10px 18px", padding: 0, listStyle: "disc" }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: "6px 0 10px 18px", padding: 0 }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ margin: "0 0 4px 0", lineHeight: 1.55 }}>{children}</li>
        ),
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
