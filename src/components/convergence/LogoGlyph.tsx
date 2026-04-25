// Lacunex anchor-arc glyph. Two anchored circles + connecting curve.
// Lacuna (the gap) + nexus (the connection). The thread-coloured accent
// always sits on the second anchor — the "cross-turn" anchor, the move
// only Lacunex makes. Variants ported from the design package.

import { aw } from "./tokens";

type Variant = "default" | "mark" | "micro" | "outline";

interface LogoGlyphProps {
  size?: number;
  color?: string;
  accent?: string;
  variant?: Variant;
  strokeWidth?: number;
  className?: string;
}

export function LogoGlyph({
  size = 64,
  color = aw.ink,
  accent = aw.thread,
  variant = "default",
  strokeWidth,
  className,
}: LogoGlyphProps) {
  const sw = strokeWidth ?? Math.max(1.5, size / 40);

  if (variant === "mark") {
    // Stand-alone app icon — thicker curve, anchors slightly larger
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: "block" }}
        className={className}
        aria-hidden
      >
        <path
          d="M 22 30 C 22 60, 78 60, 78 30"
          fill="none"
          stroke={color}
          strokeWidth={sw * 1.4}
          strokeLinecap="round"
        />
        <circle cx="22" cy="30" r="9" fill={color} />
        <circle cx="78" cy="30" r="9" fill={accent} />
      </svg>
    );
  }

  if (variant === "micro") {
    // Tiny — drop the connection, just the two-tone anchor
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: "block" }}
        className={className}
        aria-hidden
      >
        <circle cx="32" cy="50" r="22" fill={color} />
        <circle cx="68" cy="50" r="22" fill={accent} />
      </svg>
    );
  }

  if (variant === "outline") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ display: "block" }}
        className={className}
        aria-hidden
      >
        <path
          d="M 22 38 C 22 68, 78 68, 78 38"
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <circle cx="22" cy="38" r="6" fill="none" stroke={color} strokeWidth={sw} />
        <circle cx="78" cy="38" r="6" fill="none" stroke={accent} strokeWidth={sw} />
      </svg>
    );
  }

  // default — used in the wordmark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block" }}
      className={className}
      aria-hidden
    >
      <path
        d="M 22 38 C 22 68, 78 68, 78 38"
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <circle cx="22" cy="38" r="6" fill={color} />
      <circle cx="78" cy="38" r="6" fill={accent} />
    </svg>
  );
}

interface WordmarkProps {
  size?: number;
  color?: string;
  accent?: string;
  weight?: 400 | 500 | 600 | 700;
}

export function Wordmark({
  size = 22,
  color = aw.ink,
  accent = aw.thread,
  weight = 500,
}: WordmarkProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.32,
      }}
    >
      <LogoGlyph size={size * 1.25} color={color} accent={accent} />
      <span
        style={{
          fontFamily: aw.sans,
          fontSize: size,
          fontWeight: weight,
          color,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        lacunex
      </span>
    </span>
  );
}
