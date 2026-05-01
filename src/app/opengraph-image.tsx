// Dynamic Open Graph image for share previews. Next.js generates this at
// build time and serves it from /opengraph-image (referenced from
// metadata.openGraph.images in src/app/layout.tsx).
//
// Designed to match the anchor-web token system used in the convergence
// map — off-white field, ink-black serif headline, italic citation, single
// ochre accent on the architecture row. No external assets; fonts loaded
// from next/font don't apply inside ImageResponse, so we use the satori-
// supplied "default" sans/serif fallback.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lacunex — hackathon archive, April 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F5F1E8"; // anchor-web bg
const SURFACE = "#FAF7F1"; // anchor-web surface
const INK = "#0E0E0C";
const MUTED = "#6B655A";
const MUTED_2 = "#A39C8E";
const RULE = "#D9D2C2";
const THREAD = "#B7553B"; // ochre accent

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: INK,
          fontFamily: "serif",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          position: "relative",
        }}
      >
        {/* top kicker */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 18,
            color: THREAD,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          cross-turn reasoning, rendered live
        </div>

        {/* headline */}
        <div
          style={{
            fontSize: 84,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginTop: 26,
            color: INK,
            display: "flex",
          }}
        >
          Lacunex
        </div>

        <div
          style={{
            fontSize: 38,
            fontWeight: 400,
            lineHeight: 1.18,
            letterSpacing: "-0.01em",
            marginTop: 12,
            color: INK,
            maxWidth: 980,
            display: "flex",
          }}
        >
          Goal-directed interviews. Both sides leave with something.
        </div>

        {/* spacer */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* three-pattern row */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: SURFACE,
            border: `1px solid ${RULE}`,
            padding: "22px 28px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              color: MUTED,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            three patterns, one loop
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 26,
              color: INK,
              marginTop: 8,
              letterSpacing: "0.01em",
              display: "flex",
            }}
          >
            Orchestrator-Workers &nbsp;·&nbsp; Parallelization &nbsp;·&nbsp; Routing
          </div>
          <div
            style={{
              fontSize: 18,
              color: MUTED,
              fontStyle: "italic",
              marginTop: 8,
              display: "flex",
            }}
          >
            three of the five patterns from Anthropic&apos;s &ldquo;Building Effective
            Agents&rdquo;
          </div>
        </div>

        {/* bottom strap */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            color: MUTED_2,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex" }}>hackathon archive</div>
          <div style={{ display: "flex" }}>
            Built with Opus 4.7 · April 2026 · MIT · 1 of 288 judged
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
