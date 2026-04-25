"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { aw } from "@/components/convergence/tokens";
import { Wordmark, LogoGlyph } from "@/components/convergence/LogoGlyph";
import { Mono } from "@/components/convergence/Mono";

// Kept in sync with src/lib/invites.ts (server-side). Duplicated here so the
// client bundle doesn't pull in node:fs / node:crypto.
const TOKEN_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{16}$/;
const isValidToken = (s: string) => TOKEN_PATTERN.test(s);

export default function LandingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Paste the invite code or link you were given.");
      return;
    }
    const match = trimmed.match(/\/i\/([1-9A-HJ-NP-Za-km-z]{16})/);
    const candidate = match ? match[1] : trimmed;
    if (!isValidToken(candidate)) {
      setError("That doesn't look like a valid invite code.");
      return;
    }
    router.push(`/i/${candidate}`);
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
      {/* Header — quieter than the product surfaces. No breadcrumb, no
          status; just brand and a way out. */}
      <header
        style={{
          padding: "16px 36px",
          background: aw.surface,
          borderBottom: `1px solid ${aw.rule}`,
        }}
      >
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Wordmark size={22} />
          <Link
            href="https://github.com/Attius-Digital-Art/lacunex"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Mono s={11} c={aw.muted}>
              github ↗
            </Mono>
          </Link>
        </div>
      </header>

      {/* Hero — calmer typography, more space than a product surface, so the
          visitor knows this is the front door, not the workspace. */}
      <main
        style={{
          flex: 1,
          padding: "56px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 760, width: "100%", textAlign: "center" }}>
          <Mono u s={10} c={aw.thread}>
            cross-turn reasoning, rendered live
          </Mono>
          <h1
            style={{
              fontFamily: aw.serif,
              fontSize: 48,
              fontWeight: 400,
              letterSpacing: "-0.015em",
              lineHeight: 1.05,
              color: aw.ink,
              margin: "16px 0 12px",
            }}
          >
            Goal-directed interviews. Both sides leave with something.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: aw.muted,
              lineHeight: 1.65,
              maxWidth: 580,
              margin: "0 auto",
            }}
          >
            A Host sets the goals. The platform runs the conversation live, finds the
            patterns across turns, and hands the participant a reflection worth keeping.
          </p>
        </div>

        <div
          style={{
            marginTop: 56,
            width: "100%",
            maxWidth: 1040,
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {/* Host */}
          <Link
            href="/host"
            style={{
              padding: "26px 26px 24px",
              background: aw.surface,
              border: `1px solid ${aw.rule}`,
              textDecoration: "none",
              color: aw.ink,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "border-color 120ms ease",
            }}
            className="lacunex-role-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoGlyph size={22} variant="default" />
              <Mono u s={9} c={aw.muted}>
                host
              </Mono>
            </div>
            <div
              style={{
                fontFamily: aw.serif,
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              I&apos;m running interviews.
            </div>
            <p style={{ fontSize: 13, color: aw.muted, lineHeight: 1.55, margin: 0 }}>
              Pick a brief, generate participant invite links, view rounds, open the
              cohort convergence map.
            </p>
            <Mono s={10} c={aw.thread} style={{ marginTop: 4 }}>
              <span style={{ borderBottom: `1px solid ${aw.thread}`, paddingBottom: 1 }}>
                open host hub →
              </span>
            </Mono>
          </Link>

          {/* Participant */}
          <div
            style={{
              padding: "26px 26px 24px",
              background: aw.surface,
              border: `1px solid ${aw.rule}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoGlyph size={22} variant="micro" />
              <Mono u s={9} c={aw.muted}>
                participant
              </Mono>
            </div>
            <div
              style={{
                fontFamily: aw.serif,
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              I have an invite.
            </div>
            <p style={{ fontSize: 13, color: aw.muted, lineHeight: 1.55, margin: 0 }}>
              Paste the invite link or code your host sent you.
            </p>
            <form onSubmit={handleJoin} style={{ marginTop: 6 }}>
              <input
                type="text"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setError(null);
                }}
                placeholder="invite code or link"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: `1px solid ${aw.rule}`,
                  background: aw.bg,
                  fontFamily: aw.mono,
                  fontSize: 11,
                  color: aw.ink,
                  outline: "none",
                  letterSpacing: "0.04em",
                }}
              />
              <button
                type="submit"
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "10px 14px",
                  background: aw.ink,
                  color: aw.surface,
                  border: "none",
                  fontFamily: aw.mono,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                join interview
              </button>
              {error && (
                <div style={{ marginTop: 6 }}>
                  <Mono s={10} c={aw.thread}>
                    {error}
                  </Mono>
                </div>
              )}
            </form>
          </div>

          {/* Demo */}
          <Link
            href="/demo"
            style={{
              padding: "26px 26px 24px",
              background: aw.surface,
              border: `1px solid ${aw.rule}`,
              textDecoration: "none",
              color: aw.ink,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "border-color 120ms ease",
            }}
            className="lacunex-role-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LogoGlyph size={22} variant="outline" />
              <Mono u s={9} c={aw.muted}>
                demo
              </Mono>
            </div>
            <div
              style={{
                fontFamily: aw.serif,
                fontSize: 22,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              Just looking.
            </div>
            <p style={{ fontSize: 13, color: aw.muted, lineHeight: 1.55, margin: 0 }}>
              Both sides in one window — participant chat on the left, host dashboard
              filling live on the right.
            </p>
            <Mono s={10} c={aw.thread} style={{ marginTop: 4 }}>
              <span style={{ borderBottom: `1px solid ${aw.thread}`, paddingBottom: 1 }}>
                open demo view →
              </span>
            </Mono>
          </Link>
        </div>

        <div style={{ marginTop: 64, textAlign: "center" }}>
          <Mono s={10} c={aw.muted2}>
            Built for the Anthropic &quot;Built with Opus 4.7&quot; hackathon · April 2026
            · Open source · MIT
          </Mono>
        </div>
      </main>

      <style>{`
        .lacunex-role-card:hover {
          border-color: ${aw.thread} !important;
        }
      `}</style>
    </div>
  );
}
