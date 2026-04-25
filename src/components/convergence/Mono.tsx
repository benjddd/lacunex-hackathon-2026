import type { CSSProperties, ReactNode } from "react";
import { aw } from "./tokens";

// Mono label primitive used throughout the aggregation hero. Mirrors the
// `M2` helper from the JSX design prototype.
export function Mono({
  children,
  c = aw.muted2,
  s = 10,
  u,
  style,
}: {
  children: ReactNode;
  c?: string;
  s?: number;
  u?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        fontFamily: aw.mono,
        fontSize: s,
        color: c,
        letterSpacing: u ? "0.1em" : "0",
        textTransform: u ? "uppercase" : "none",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
