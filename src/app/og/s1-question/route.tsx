// /og/s1-question — Beat 1 question card for the v2 demo video.
// Renders the italic-serif headline question on a near-black background,
// 1920x1080. Curl this URL and drop the PNG into Descript at 0:00–0:06.
//
//   curl http://localhost:3000/og/s1-question -o transcripts/captures/_descript/s1-question.png

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

const BG = "#0A0A09";
const INK = "#F5F1E8";

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
          alignItems: "center",
          justifyContent: "center",
          padding: "0 160px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontStyle: "italic",
            lineHeight: 1.18,
            letterSpacing: "-0.005em",
            textAlign: "center",
            maxWidth: 1500,
            display: "flex",
          }}
        >
          What does the platform find when nobody tells it what to look for?
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
