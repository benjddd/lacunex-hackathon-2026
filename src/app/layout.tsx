import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Anchor-Web design tokens. Used by the convergence map / aggregation hero
// (src/app/rounds/[roundId]/aggregate). Loaded globally so they're cached
// once; consumers opt in via the CSS variables.
const instrumentSerif = Instrument_Serif({
  variable: "--font-anchor-serif",
  subsets: ["latin"],
  weight: "400",
});

const interTight = Inter_Tight({
  variable: "--font-anchor-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-anchor-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Open Graph / Twitter / canonical metadata. metadataBase resolves relative
// URLs (icons, OG image) against the deploy origin so share previews work.
// VERCEL_URL is set in the Vercel build environment and is the right value
// for both the prod deploy (vercel.app subdomain) and any preview deploy.
const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";
const OG_TITLE = "Lacunex — hackathon archive (Apr 2026)";
const OG_DESCRIPTION =
  "Built for the Anthropic 'Built with Opus 4.7' hackathon, April 2026. ~20,000 people applied; this entry is one of the 288 judged. Adaptive interviews — Host sets goals, the platform runs the conversation live and produces structured insight during it. The deployed demo is paused while the project regroups for v2.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lacunex (hackathon archive)",
    template: "%s · Lacunex (hackathon)",
  },
  description: OG_DESCRIPTION,
  applicationName: "Lacunex (hackathon archive)",
  keywords: [
    "Anthropic",
    "Claude",
    "Opus 4.7",
    "agentic",
    "interview platform",
    "qualitative research",
    "hackathon",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Lacunex (hackathon archive)",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [
      {
        // Next.js auto-resolves /opengraph-image to the file-based opengraph-image.tsx
        // route handler we ship at app/opengraph-image.tsx. metadataBase above
        // ensures the absolute URL is built correctly.
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Lacunex — hackathon archive, April 2026",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  // Pin the SVG anchor-glyph as the favicon. Note: a `src/app/favicon.ico`
  // file would override this via Next's file-system convention regardless of
  // what's set here — keep that slot empty so the SVG wins.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

// Read on the server so the banner SSRs without a flicker. The same env var
// (DEMO_DISABLED) makes every cost-bearing API route return 503 — see
// src/lib/demo-gate.ts.
const DEMO_DISABLED = process.env.DEMO_DISABLED === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${interTight.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {DEMO_DISABLED && (
          <div
            role="status"
            style={{
              background: "#FEF3C7",
              borderBottom: "1px solid #FCD34D",
              color: "#78350F",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 11,
              letterSpacing: "0.04em",
              padding: "6px 16px",
              textAlign: "center",
            }}
          >
            Hackathon archive (April 2026) — live demo is paused while we
            regroup for v2. The repo and making-of are still readable.
          </div>
        )}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
