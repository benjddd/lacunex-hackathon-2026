// /og/s10-close — Beat 10 close card for the v2 demo video.
// Wordmark + URL + builder line on a near-black background, 1920x1080.
//
//   curl http://localhost:3000/og/s10-close -o transcripts/captures/_descript/s10-close.png

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

const BG = "#0A0A09";
const INK = "#F5F1E8";
const MUTED = "#D9D2C2";
const SOFT = "#8A8377";

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
          padding: "180px 80px 120px",
          fontFamily: "serif",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: INK,
            display: "flex",
            marginBottom: 80,
          }}
        >
          Lacunex
        </div>

        {/* Three centred lines */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "monospace",
            fontSize: 32,
            color: MUTED,
            lineHeight: 1.6,
            gap: 8,
          }}
        >
          <div style={{ display: "flex" }}>Built in five days. Open source.</div>
          <div style={{ display: "flex" }}>lacunex.com</div>
        </div>

        {/* Spacer pushing the builder line to bottom */}
        <div style={{ flex: 1, display: "flex" }} />

        {/* Builder line — italic serif, soft warm grey */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontStyle: "italic",
            fontSize: 30,
            color: SOFT,
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: "flex" }}>for anyone who needed to listen at scale</div>
          <div style={{ display: "flex" }}>and didn&apos;t have time.</div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
