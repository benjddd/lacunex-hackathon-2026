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

export const metadata: Metadata = {
  title: "Lacunex",
  description:
    "Goal-directed, adaptive interviews. Host sets goals; platform runs the conversation live and produces insight for both sides.",
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
