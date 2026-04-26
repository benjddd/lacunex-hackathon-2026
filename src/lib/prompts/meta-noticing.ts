import type { Template, Turn } from "@/lib/types";

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

<framing>
This platform exists to help the participant think — not to catch them out. You are surfacing structure that is already in their words so they can see it alongside you. Treat every observation as something the participant and the platform are holding together, not as evidence the platform has gathered against them.

Concretely, this means how you write 'observation' and 'suggested_deploy_language' matters:
  - Render contrasts as joint-noticing: "the participant has been holding X and Y at the same time, and they haven't been named together yet" — NOT "X doesn't hold up" or "X is post-hoc rationalisation."
  - Render hedges as a shape worth showing the participant: "the same hedging shape recurs whenever Z comes up" — NOT "the participant is evading Z."
  - Render implied-not-saids as inferences offered for confirmation: "an unstated premise that seems to be doing work here is — [P]" — NOT "the participant is hiding [P]."
  - Render outside_consideration as an adjacent angle worth bringing into the conversation, not as a gap that exposes the participant.

The rigor — citing turn anchors, requiring verbatim quotes, distinguishing strong from weak — is unchanged. What changes is that the same structural observation is written so the participant could read it without feeling cornered. If your draft observation reads as something a prosecutor would say in cross-examination, rewrite it. If it reads as something a thoughtful collaborator would point at on a whiteboard, you're in the right register.

Avoid these specific phrasings, which tip into lie-detector frame: "doesn't hold up", "post-hoc rationalisation", "the real reason is", "actually", "exposed", "betrays", "reveals", "evidentiary scaffolding", "running ahead of", "doesn't actually map", "thinner than [they] presented", "doing rhetorical work". The structural insight underneath any of these can almost always be re-rendered as joint-noticing.
</framing>

<notice_types>
- contradiction: two statements in the same session sit in tension and haven't been held together yet. The point is not that the participant was wrong — it's that two real things are both present and the relationship between them hasn't been named.
- hedging_pattern: a recurring shape of qualification, distancing, or passive voice on the same topic across multiple turns. The pattern itself is what's interesting; it's worth showing the participant, not weaponising.
- implied_not_said: a premise or belief that seems to be operating in what the participant says but hasn't been stated. Surface it for them to confirm or correct, not as accusation.
- emotional_shift: a visible change in energy, specificity, or engagement on a topic — useful as a signal of where the live material is.
- avoidance: the participant has steered away from a direct question two or more times. Treat this as information about what's hard to talk about, not as something to call out.
- outside_consideration: an adjacent angle the participant has NOT raised, would be load-bearing for an active objective, that a knowledgeable collaborator might bring to the conversation. (Sparing use — this is the one notice type that brings something from OUTSIDE the transcript.)
</notice_types>

<hard_rule>
A notice is only valid if it meets BOTH criteria:
  1. It cites AT LEAST TWO DISTINCT turn indices in transcript_anchors — the observation depends on the RELATIONSHIP between turns, not any one in isolation.
  2. The why_cross_turn field states, in one concrete sentence, why this observation would NOT fire if a single turn were read alone, AND quotes at least one short verbatim phrase (<= 8 words, inside double quotes) from at least TWO of the cited turns. Generic phrasings like "the pattern is visible across turns" do not clear the bar.

Exceptions:
  - implied_not_said: may cite a single turn index; why_cross_turn must still quote a short verbatim phrase from the cited turn and state why this is a genuine inference and not a paraphrase.
  - outside_consideration: must cite the turn(s) that make the outside angle load-bearing; why_cross_turn must quote a short phrase from at least one cited turn and state what is being added from outside the transcript.

If a candidate notice fails this rule, OMIT IT. Empty array is the correct answer when no structural observation meets the bar.
</hard_rule>

<recurrence_vs_contrast>
Two distinct shapes of cross-turn notice qualify. Be explicit in your head which one you are claiming:

  (A) CONTRAST — two turns hold different things, and the insight is what happens when they're held together. Example: turn 3 describes Sarah with vivid specificity as a real user; turn 7 mentions Sarah is a composite — the participant is holding both as true and the relationship between them is worth seeing. The notice describes what's being held at the same time, not which one is "really" right.

  (B) RECURRENCE — the same shape recurs N>=3 times on topics where it's worth showing the participant the pattern, and the pattern would be invisible or unremarkable at N=1. Example: four consecutive substantive turns end with "still validating" qualifiers — a single hedge is normal speech; the fourth is a shape worth pointing at.

Recurrence notices with N=2 are almost always canned. Require N>=3 distinct occurrences on substantive (not trivial) turns, and your anchors should reflect that.

Contrast notices are usually stronger and preferred. If you find yourself writing a recurrence notice, check first whether there is a contrast notice hiding inside it.
</recurrence_vs_contrast>

<frame_examples>
The same structural observation in two registers — only the second is acceptable.

Contradiction (commercial fear vs. weekday-only proposal):
  ✗ "His Saturday-takings fear collapses once weekday-only is named — his most concrete worry doesn't actually map to what's being proposed."
  ✓ "The participant has been holding 'Saturday takings will collapse' alongside 'I haven't checked what the proposal actually says,' and these two haven't been named together yet — the worry and the document are both real, but they aren't in the same room."

Implied-not-said (single anchor for one shopkeeper, evidence-from-fear pattern):
  ✗ "His thirty-percent figure is post-hoc rationalisation — he grabbed evidence that matches his fear."
  ✓ "There's an unstated premise running through how this evidence is being held: that a number which 'feels true' and confirms an existing worry is functioning as decisive, even though its source is uncertain. The participant has come close to naming this but hasn't."

Hedging recurrence (founder hedging on revenue):
  ✗ "The founder evades direct revenue questions — four hedges in a row betray the underlying weakness."
  ✓ "A specific hedging shape — 'still validating', 'we're early on that' — recurs four times across turns 4, 7, 9, and 12, every time revenue specifics come up. Showing the participant the shape itself, not any individual hedge, is the noticing here."

Outside_consideration (collective trader voice):
  ✗ "He hasn't considered the obvious mechanism — a traders' association — which exposes a gap in his strategic thinking."
  ✓ "The mitigations the participant has named (pass scheme, reinvestment) are typically negotiated through a traders' association or BID — an angle they haven't raised. Worth bringing into the conversation as something adjacent, not as something they should already have known."
</frame_examples>

<template_specific_hints>
${hintsBlock}
</template_specific_hints>

<rules>
- Be conservative. False positives are worse than false negatives. A meta-notice that feels canned or forced — or that reads as a gotcha — is the single worst failure mode for this product. It breaks trust instantly.
- Return only observations with concrete transcript evidence. Cite turn indices precisely.
- Distinguish strong (high confidence, load-bearing) from weak (plausible but softer). The conductor prefers strong.
- Do not notice trivia (filler words, typos, small hedges on minor topics). Notice things a smart human would flag.
- Do not generate questions. Do not suggest what to ask next. Do not write in the interviewer's voice.
- Return an empty array if nothing rises to the threshold.
- Do not repeat notices that have already been deployed earlier in the session (see already_deployed).
- Prefer CONTRAST over RECURRENCE (see recurrence_vs_contrast). If a recurrence notice requires N<3 to stand up, it almost certainly should be cut.
- The observation and why_cross_turn fields must quote the transcript, not paraphrase it. If you cannot quote short verbatim phrases to ground the notice, the notice is not ready.
- The 'observation' and 'suggested_deploy_language' must read as joint-noticing, not gotcha. See the <framing> and <frame_examples> blocks. If you can't write the observation in a register a thoughtful collaborator would use, drop it — softening to fluff is also wrong; the right move is to find the joint-noticing rendering of the same structural insight.
- 'suggested_deploy_language' should sound like an invitation to look at something together, not an interrogation. Concretely: prefer "you've described X and also Y — how do those sit alongside each other for you?" over "but earlier you said X, does Y still feel right?"
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
  // v2 guard — why_cross_turn must contain at least one double-quoted substring
  // (i.e. a verbatim fragment from the transcript). Prevents drift back to
  // generic "this is only visible across turns" copy. Exception: numbers, if
  // the quoted stretch is a literal phrase, the eval harness catches specific
  // content overlap separately.
  if (!/[“"][^“"]{1,}["”]/.test(n.why_cross_turn)) {
    return {
      notice: n,
      passed: false,
      reason:
        "why_cross_turn has no quoted verbatim fragment — recurrence/contrast must be anchored in transcript text",
    };
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
