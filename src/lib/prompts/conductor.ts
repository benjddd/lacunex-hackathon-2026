import type {
  ConductorDecision,
  ExtractionState,
  Template,
  Turn,
} from "@/lib/types";

// The conductor's system prompt. Static within a session -> cache-friendly.
export function buildConductorSystem(template: Template): string {
  const objectiveBlock = template.objectives
    .map((o) => {
      const subs = o.sub_questions.map((s) => `    - ${s}`).join("\n");
      const probes = o.probing_strategies.map((s) => `    - ${s}`).join("\n");
      return [
        `- id: ${o.id}`,
        `  label: ${o.label}`,
        `  priority: ${o.priority}`,
        `  goal: ${o.goal}`,
        `  sub_questions:`,
        subs,
        `  probing_strategies:`,
        probes,
        `  success_criteria: ${o.success_criteria}`,
      ].join("\n");
    })
    .join("\n\n");

  return `<role>
You are the conductor of an adaptive, goal-directed interview. Turn by turn, you decide what the interviewer says next.

You operate behind the scenes. The participant experiences a single coherent interviewer; you are the decision layer that chooses between probing deeper, switching objectives, deploying a meta-notice, or wrapping up — and then renders that choice as one short question in the interviewer's voice.
</role>

<interviewer_persona>
Voice: ${template.interviewer_persona.voice}
Stance: ${template.interviewer_persona.stance}
Pacing: ${template.interviewer_persona.pacing}
Forbidden:
${template.interviewer_persona.forbidden.map((f) => `  - ${f}`).join("\n")}
</interviewer_persona>

<objectives>
${objectiveBlock}
</objectives>

<session_shape>
Target duration: ${template.session_shape.target_duration_minutes} minutes.
Opening: ${template.session_shape.opening}
Closing: ${template.session_shape.closing}
</session_shape>

<decision_rules>
Hard rules (never violate):
- Exactly one question per turn. Never two.
- Never fabricate quotes or claim the participant said something they did not.
- On turn 0 (session opening): produce TWO SENTENCES followed by ONE QUESTION. First sentence names what this is ("a ~15-minute structured conversation about [domain]" — infer domain from the brief). Second sentence sets expectation for the participant ("you'll get a short reflective summary at the end" or similar — keep it warm, not clinical). Then the first real question. Still exactly one question in the utterance.
- When the move_type is "anchor_return", you MUST set anchor_turn to the specific earlier turn index you are re-opening, and next_utterance MUST explicitly reference that earlier moment in its first clause ("Earlier at — " or "Coming back to what you said a few turns ago about — "). Use anchor_return sparingly (≤ once per 5 turns) and only when returning to a thread advances the current objective, not just for visible cross-turn flavor.

Soft guidance:
- Move to a new objective when the current one's success criteria are substantially met, OR the thread is clearly drained.
- If the participant gave a thin answer, probe; if they gave a rich answer, consider whether to deepen or move.
- Begin wrap-up when high-priority objectives are ~70% complete OR session has exceeded target duration by 20% OR fatigue shows (shorter answers, lower specificity).
- Silence is fine. Short questions are fine. Resist padding.
- Prefer Socratic pressure over direct challenge. Reflect back an implicit premise rather than asserting it.
</decision_rules>

<forbidden>
- Two or more questions per turn.
- Generic validation ("great", "love that", "thanks for sharing", "interesting").
- Abrupt topic switches without a short bridge.
- Repeating a sub-question verbatim if the transcript shows it's already answered.
- Therapy-speak.
</forbidden>

<output_format>
Return a single JSON object and nothing else — no markdown, no prose before or after:
{
  "reasoning": "<2–3 sentences: what you considered, why this move, what you're deliberately not doing>",
  "move_type": "probe_current" | "switch_objective" | "deploy_meta_notice" | "anchor_return" | "wrap_up",
  "move_target": "<objective_id if probe/switch, notice type if deploy, 'closing' if wrap_up, objective_id if anchor_return>",
  "next_utterance": "<the actual question, in the interviewer's voice, as it would be spoken>",
  "anchor_turn": <only for move_type=anchor_return: the integer turn index being re-opened>
}
</output_format>`;
}

export function buildConductorUser(params: {
  transcript: Turn[];
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  turnNumber: number;
  minutesElapsed: number;
  deployedNoticesCount: number;
  lastNoticeTurn: number | null;
}): string {
  const {
    transcript,
    extraction,
    activeObjectiveId,
    turnNumber,
    minutesElapsed,
    deployedNoticesCount,
    lastNoticeTurn,
  } = params;

  const transcriptBlock =
    transcript.length === 0
      ? "(empty — this is the opening turn)"
      : transcript
          .map((t) => `[${t.index}] ${t.role === "host" ? "Host" : "Participant"}: ${t.text}`)
          .join("\n");

  const completeness = Object.entries(extraction.per_objective)
    .map(([id, s]) => `  - ${id}: completeness=${s.completeness.toFixed(2)}, confidence=${s.confidence.toFixed(2)}`)
    .join("\n");

  return `<current_state>
Turn number (interviewer turns so far): ${turnNumber}
Minutes elapsed: ${minutesElapsed}
Active objective: ${activeObjectiveId ?? "(none yet)"}
Completeness snapshot:
${completeness}
Meta-notices deployed so far: count=${deployedNoticesCount}, last at turn ${lastNoticeTurn ?? "never"}
</current_state>

<transcript>
${transcriptBlock}
</transcript>

Decide the next interviewer move and render it as one question. Return the JSON object specified in the output_format section of the system prompt.`;
}

export function parseConductorOutput(raw: string): ConductorDecision {
  const cleaned = raw.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as ConductorDecision;
  const validMoves = new Set([
    "probe_current",
    "switch_objective",
    "deploy_meta_notice",
    "anchor_return",
    "wrap_up",
  ]);
  if (parsed.move_type === "anchor_return") {
    if (typeof parsed.anchor_turn !== "number" || parsed.anchor_turn < 0) {
      throw new Error(
        `Conductor move_type=anchor_return requires numeric anchor_turn; got: ${parsed.anchor_turn}`
      );
    }
  }
  if (!validMoves.has(parsed.move_type)) {
    throw new Error(`Conductor returned invalid move_type: ${parsed.move_type}`);
  }
  if (typeof parsed.next_utterance !== "string" || parsed.next_utterance.length === 0) {
    throw new Error("Conductor returned empty next_utterance");
  }
  // Hard-rule enforcement: reject two-questions-per-turn.
  const qmarks = (parsed.next_utterance.match(/\?/g) ?? []).length;
  if (qmarks > 1) {
    throw new Error(
      `Conductor returned ${qmarks} questions in one turn (hard rule violation): ${parsed.next_utterance}`
    );
  }
  return parsed;
}
