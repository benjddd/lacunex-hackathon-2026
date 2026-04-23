import type { ExtractionState, Template, Turn } from "@/lib/types";

// The meta-noticing layer. Observation-only — does NOT generate questions.
// Runs after each participant turn. Returns zero or more candidate notices;
// the conductor decides whether to deploy and how.
//
// Hard rule the schema enforces (v0, Thu iteration target):
//   A notice only counts if:
//     (1) it cites >= 2 DISTINCT turn indices in `transcript_anchors`, AND
//     (2) it provides a `why_cross_turn` sentence that explains why this
//         observation would NOT fire on either referenced turn in isolation.
//
//   Notices that can be produced from a single turn are rejected at the
//   orchestrator level (not "meta-noticing", just chatbot-style follow-up).
//   The `implied_not_said` notice type is exempt from the 2-index rule but
//   must still explain why the inference isn't merely a paraphrase.
//
// Failure mode to watch: over-firing. Empty array is a valid and frequent
// answer. Under-firing is acceptable; over-firing kills participant trust
// and is the single worst failure mode for this product.

export type MetaNoticeType =
  | "contradiction"
  | "hedging_pattern"
  | "implied_not_said"
  | "emotional_shift"
  | "avoidance"
  | "outside_consideration"; // new: platform brings an adjacent angle not in-transcript

export interface MetaNotice {
  type: MetaNoticeType;
  strength: "strong" | "weak";
  transcript_anchors: number[];
  why_cross_turn: string; // why this observation needs >1 turn (or for implied_not_said, why it's not a paraphrase)
  observation: string;
  suggested_deploy_language: string;
}

export function buildMetaNoticingSystem(template: Template): string {
  const hintsBlock = template.objectives
    .flatMap((obj) =>
      obj.meta_notice_hints.map((h) => `- (${obj.id}) ${h}`)
    )
    .join("\n");

  return `<role>
You are the noticing layer of an adaptive interview platform. After each participant turn you observe the full transcript and return zero or more candidate observations — patterns, tensions, or implications a skilled human interviewer might catch.

You do NOT generate interview questions. You do NOT decide what happens next. Another layer makes those decisions. Your only job is to notice.
</role>

<notice_types>
- contradiction: a current statement conflicts with a prior statement in the same session.
- hedging_pattern: repeated hedges, qualifiers, passive voice, or distancing language on the same topic across multiple turns.
- implied_not_said: an assumption or belief clearly operative in what the participant says but never stated explicitly.
- emotional_shift: a visible change in energy, specificity, or engagement on a topic.
- avoidance: the participant redirects a direct question two or more times.
- outside_consideration: an adjacent angle that the participant has NOT raised, would be load-bearing for an active objective, and that a skilled outside observer with domain knowledge might surface. (Sparing use — this is the one notice type that brings something from OUTSIDE the transcript rather than from inside it.)
</notice_types>

<hard_rule>
A notice is only valid if it meets BOTH criteria:
  1. It cites AT LEAST TWO DISTINCT turn indices in transcript_anchors — the observation depends on the RELATIONSHIP between turns, not any one in isolation.
  2. The why_cross_turn field states, in one concrete sentence, why this observation would NOT fire if a single turn were read alone.

Exceptions:
  - implied_not_said: may cite a single turn index, but why_cross_turn must still state why this is a genuine inference and not a paraphrase of what was said.
  - outside_consideration: must cite the turn(s) that make the outside angle load-bearing, and why_cross_turn must state what is being added from outside the transcript.

If a candidate notice fails this rule, OMIT IT. Empty array is the correct answer when no structural observation meets the bar.
</hard_rule>

<template_specific_hints>
${hintsBlock}
</template_specific_hints>

<rules>
- Be conservative. False positives are worse than false negatives. A meta-notice that feels canned or forced is the single worst failure mode for this product — it breaks trust instantly.
- Return only observations with concrete transcript evidence. Cite turn indices precisely.
- Distinguish strong (high confidence, load-bearing) from weak (plausible but softer). The conductor prefers strong.
- Do not notice trivia (filler words, typos, small hedges on minor topics). Notice things a smart human would flag.
- Do not generate questions. Do not suggest what to ask next. Do not write in the interviewer's voice.
- Return an empty array if nothing rises to the threshold.
- Do not repeat notices that have already been deployed earlier in the session (see already_deployed).
</rules>

<output_format>
Return a JSON array. Each element:
{
  "type": "contradiction | hedging_pattern | implied_not_said | emotional_shift | avoidance | outside_consideration",
  "strength": "strong | weak",
  "transcript_anchors": [<int>, ...],
  "why_cross_turn": "<one sentence: why this observation requires more than one turn, or for implied_not_said/outside_consideration, why it's not a paraphrase of what was said>",
  "observation": "<plain-language description of what you noticed, 1-2 sentences>",
  "suggested_deploy_language": "<how a skilled interviewer might gently surface this, ~1 sentence. This is a suggestion, not a mandate.>"
}

Return [] if nothing notable. No prose outside the JSON.
</output_format>`;
}

export function buildMetaNoticingUser(params: {
  transcript: Turn[];
  alreadyDeployed: { turn: number; type: string }[];
}): string {
  const { transcript, alreadyDeployed } = params;
  const transcriptBlock = transcript
    .map(
      (t) =>
        `[${t.index}] ${t.role === "host" ? "Host" : "Participant"}: ${t.text}`
    )
    .join("\n");
  const deployedBlock =
    alreadyDeployed.length === 0
      ? "(none)"
      : alreadyDeployed
          .map((d) => `- turn ${d.turn}: ${d.type}`)
          .join("\n");
  return `<transcript>
${transcriptBlock}
</transcript>

<already_deployed>
${deployedBlock}
</already_deployed>

Return the JSON array specified in the system prompt. Empty array [] is valid.`;
}

export function parseMetaNoticingOutput(raw: string): MetaNotice[] {
  return validateMetaNotices(parseMetaNoticingCandidates(raw)).passed;
}

// Split variant for diagnostics (used by eval harness). Returns every
// candidate parsed from the model plus per-candidate kill-rule verdict.
// The main app code only ever needs the `.passed` list; the harness wants
// to see what was rejected and why.
export interface MetaNoticeVerdict {
  notice: MetaNotice;
  passed: boolean;
  reason: string; // empty string if passed; else kill-rule reason
}

export function parseMetaNoticingCandidates(raw: string): MetaNotice[] {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("meta-noticing response is not a JSON array");
  }
  return parsed as MetaNotice[];
}

export function validateMetaNotices(candidates: MetaNotice[]): {
  passed: MetaNotice[];
  verdicts: MetaNoticeVerdict[];
} {
  const verdicts: MetaNoticeVerdict[] = [];
  const passed: MetaNotice[] = [];
  for (const n of candidates) {
    const verdict = judgeNotice(n);
    verdicts.push(verdict);
    if (verdict.passed) passed.push(n);
  }
  return { passed, verdicts };
}

function judgeNotice(n: MetaNotice): MetaNoticeVerdict {
  if (!n || typeof n !== "object") {
    return { notice: n, passed: false, reason: "not an object" };
  }
  if (!n.type) {
    return { notice: n, passed: false, reason: "missing type" };
  }
  if (!Array.isArray(n.transcript_anchors)) {
    return { notice: n, passed: false, reason: "transcript_anchors missing or not an array" };
  }
  const uniqueAnchors = new Set(n.transcript_anchors);
  const needsTwo = n.type !== "implied_not_said" && n.type !== "outside_consideration";
  if (needsTwo && uniqueAnchors.size < 2) {
    return {
      notice: n,
      passed: false,
      reason: `type "${n.type}" requires >=2 distinct anchors, got ${uniqueAnchors.size}`,
    };
  }
  if (typeof n.why_cross_turn !== "string" || n.why_cross_turn.trim().length === 0) {
    return { notice: n, passed: false, reason: "missing or empty why_cross_turn" };
  }
  return { notice: n, passed: true, reason: "" };
}

// Used by the extraction/session layer — tracks what's been deployed so
// noticing doesn't re-propose the same observation.
export function notDeployedRecently(
  notice: MetaNotice,
  deployed: { turn: number; type: string }[]
): boolean {
  return !deployed.some((d) => d.type === notice.type);
}
