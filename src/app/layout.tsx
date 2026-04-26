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

// Open Graph / Twitter / canonical metadata. metadataBase makes every
// relative URL (icons, OG image, etc.) resolve against the production
// origin so previews work when the URL is shared in Slack/Discord.
const SITE_URL = "https://lacunex.com";
const OG_TITLE = "Lacunex — adaptive interviews, at scale";
const OG_DESCRIPTION =
  "Cross-turn reasoning, rendered live. A Host sets goals; the platform runs every interview live, fills a structured dashboard during the conversation, and hands the participant a reflection worth keeping. Built on three of the five workflow patterns from Anthropic's Building Effective Agents — Orchestrator-Workers, Parallelization, Routing — running together every turn.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lacunex",
    template: "%s · Lacunex",
  },
  description: OG_DESCRIPTION,
  applicationName: "Lacunex",
  keywords: [
    "Anthropic",
    "Claude",
    "Opus 4.7",
    "agentic",
    "interview platform",
    "qualitative research",
    "user research",
    "civic consultation",
    "post-incident witness",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Lacunex",
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
        alt: "Lacunex — three patterns, every turn",
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
