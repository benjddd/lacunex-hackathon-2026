// Model IDs isolated here so we can swap in one edit if availability or
// pricing shifts during the hackathon. Re-verify against the Anthropic
// model catalog before the first live call.

export const MODELS = {
  // Used for the conductor: decides next move, renders the interviewer turn.
  // Opus because quality of decision-making matters more than latency in text.
  conductor: "claude-opus-4-7",

  // Used for the meta-noticing layer (observation-only). Precision critical.
  metaNoticing: "claude-opus-4-7",

  // Used for the extraction call. Mechanical, schema-bound — Haiku is enough.
  extraction: "claude-haiku-4-5-20251001",

  // Used for the end-of-session takeaway artifact. Literary output, runs
  // once per session, quality trumps cost.
  takeaway: "claude-opus-4-7",

  // Used for the mid-session takeaway preview (live "peek at your reflection"
  // drawer on the participant side). Sonnet for speed + cost — the preview
  // is ephemeral and regenerates every 3 participant turns; the final Opus
  // pass still runs at session close. Quality delta vs Opus is not
  // perceptible for a progressively-built preview.
  takeawayPreview: "claude-sonnet-4-6",
} as const;

export type ModelKey = keyof typeof MODELS;
