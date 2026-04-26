// /og/s8-architecture — Beat 8 architecture-flex card for the v2 demo video.
// Renders the THREE PATTERNS, ONE LOOP card with the three Anthropic
// patterns named and the Schluntz & Zhang citation, 1920x1080.
//
//   curl http://localhost:3000/og/s8-architecture -o transcripts/captures/_descript/s8-architecture.png

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

const BG = "#0A0A09";
const INK = "#F5F1E8";
const MUTED = "#D9D2C2";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: INK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 80px",
          fontFamily: "serif",
        }}
      >
        {/* Title — top third */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 36,
            color: INK,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "flex",
            marginBottom: 110,
          }}
        >
          Three patterns, one loop
        </div>

        {/* Pattern row — middle */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 56,
            color: INK,
            letterSpacing: "0.01em",
            display: "flex",
            marginBottom: 130,
          }}
        >
          Orchestrator-Workers &nbsp;·&nbsp; Parallelization &nbsp;·&nbsp; Routing
        </div>

        {/* Citation block — lower */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontStyle: "italic",
              color: MUTED,
              display: "flex",
            }}
          >
            from &ldquo;Building Effective Agents&rdquo;
          </div>
          <div
            style={{
              fontSize: 26,
              fontStyle: "italic",
              color: MUTED,
              display: "flex",
            }}
          >
            Schluntz &amp; Zhang &nbsp;·&nbsp; Anthropic Engineering &nbsp;·&nbsp; Dec 2024
          </div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
