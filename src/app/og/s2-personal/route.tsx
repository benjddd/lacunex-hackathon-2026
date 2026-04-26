// /og/s2-personal — Beat 2 italic title overlay for the v2 demo video.
// Renders ONLY the italic-serif "Lacunex — adaptive interviews, at scale."
// title on transparent black, 1920x1080. In Descript, layer this over a
// dimmed convergence-map still (extracted from capture-g at ~0:23).
//
//   curl http://localhost:3000/og/s2-personal -o transcripts/captures/_descript/s2-personal-title.png

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

const BG = "#0A0A09"; // near-black; in Descript, set blend mode to Screen
                      // to composite over the dimmed convergence-map still
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
            fontSize: 84,
            fontStyle: "italic",
            lineHeight: 1.2,
            letterSpacing: "-0.005em",
            textAlign: "center",
            display: "flex",
          }}
        >
          Lacunex — adaptive interviews, at scale.
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
