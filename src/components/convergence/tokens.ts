// Design tokens for the Anchor-Web direction (convergence map / aggregation
// hero). Mirrors the JSX prototype's colour + typography system. Kept in one
// module so reskinning later changes one file.

export const aw = {
  bg: "#f7f6f2",
  surface: "#ffffff",
  ink: "#0c0c0a",
  ink2: "#2a2925",
  muted: "#6b6862",
  muted2: "#a8a49d",
  rule: "#e6e3dc",
  rule2: "#efece5",
  thread: "#b42318",
  threadSoft: "#fdf2f1",
  panel: "#f1efe8",
  // The font CSS variables are declared globally in app/layout.tsx; consumers
  // reference them through inline styles to keep this whole surface scoped.
  serif: "var(--font-anchor-serif), 'Instrument Serif', Georgia, serif",
  sans: "var(--font-anchor-sans), 'Inter Tight', system-ui, -apple-system, sans-serif",
  mono: "var(--font-anchor-mono), 'JetBrains Mono', ui-monospace, 'Courier New', monospace",
} as const;

export type AwTokens = typeof aw;
