import type {
  ConductorDecision,
  ExtractionState,
  Template,
  Turn,
} from "@/lib/types";
import type { MetaNotice } from "@/lib/prompts/meta-noticing";

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
- On turn 0 (session opening): produce 2–3 SENTENCES followed by ONE QUESTION. (1) Name what this is ("a ~15-minute structured conversation about [domain]" — infer domain from the brief). (2) **If the brief has a specific real-world subject under investigation (e.g. a named proposal, an incident, a product, a decision)**, state what it is in one plain factual sentence so a participant who hasn't read a briefing can still engage — draw the facts from the domain_context block above, never invent specifics not present there. **Skip this sentence only for meta-briefs** where the participant themselves is choosing or describing the subject (e.g. brief-designer). (3) Set expectation for the participant ("you'll get a short reflective summary at the end" or similar — keep it warm, not clinical). Then the first real question. Still exactly one question in the utterance.
- When the move_type is "anchor_return", you MUST set anchor_turn to the specific earlier turn index you are re-opening, and next_utterance MUST explicitly reference that earlier moment in its first clause ("Earlier at — " or "Coming back to what you said a few turns ago about — "). Use anchor_return sparingly (≤ once per 5 turns) and only when returning to a thread advances the current objective, not just for visible cross-turn flavor.
- Before choosing move_type="wrap_up", you MUST first ask one final open check-in: something like "Before we close — is there anything you expected me to ask that we haven't covered?" Only then produce wrap_up on the subsequent turn if no new thread emerged.
- Echo probe: when a participant answer is rich but contains an unclear or ambiguous thread (a phrase that could mean multiple things), mirror their exact words back and ask them to unpack it. Example: if they said "we're trying to stay lean about it", ask "When you say 'stay lean about it' — what does that look like in practice?" This surfaces implicit meaning without leading the witness.

Soft guidance:
- Move to a new objective when the current one's success criteria are substantially met, OR the thread is clearly drained.
- If the participant gave a thin answer, probe; if they gave a rich answer, consider whether to deepen or move.
- Begin wrap-up when high-priority objectives are ~70% complete OR session has exceeded target duration by 20% OR fatigue shows (shorter answers, lower specificity).
- Silence is fine. Short questions are fine. Resist padding.
- Prefer Socratic pressure over direct challenge. Reflect back an implicit premise rather than asserting it.
- Mood and tone adaptation: read the register of the last 1-2 participant turns. If the participant sounds pressured, defensive, or flat, soften the next question's framing — ask from curiosity, not from challenge. If they sound energised and expansive, follow their energy and press deeper. Never diagnose or name the emotional state; just adjust pacing accordingly.
- Defensiveness handling: if a participant responds to a meta-notice or direct probe with pushback ("that's not really what I meant", "I don't think that's fair"), do NOT repeat or double-down on the notice. Acknowledge the correction briefly ("Fair — let me take that differently") and redirect with a neutral, forward-facing question. One graceful retreat is correct. Pressing again is not.
- Objective stall: if 'stall_turns' in current_state reaches ≥4, the current objective has been held long. Check its success_criteria: if substantially met, switch objectives. If not, try a genuinely different sub-question angle — not the same probe rephrased. At ≥6 stall turns, switch regardless unless the participant is actively expanding.
</decision_rules>

<forbidden>
- Two or more questions per turn.
- Generic validation ("great", "love that", "thanks for sharing", "interesting").
- Abrupt topic switches without a short bridge.
- Repeating a sub-question verbatim if the transcript shows it's already answered.
- Therapy-speak.
</forbidden>

${template.domain_context ? `<domain_context>
${template.domain_context}
</domain_context>

` : ""}<output_format>
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
  candidateNotices?: MetaNotice[];
  objectiveStallTurns?: number;
}): string {
  const {
    transcript,
    extraction,
    activeObjectiveId,
    turnNumber,
    minutesElapsed,
    deployedNoticesCount,
    lastNoticeTurn,
    candidateNotices,
    objectiveStallTurns = 0,
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

  const noticesBlock =
    !candidateNotices || candidateNotices.length === 0
      ? "(none this turn)"
      : candidateNotices
          .map(
            (n) =>
              `  - type=${n.type} strength=${n.strength} anchors=[${n.transcript_anchors.join(",")}]\n    observation: ${n.observation}\n    why_cross_turn: ${n.why_cross_turn}\n    suggested_deploy_language: ${n.suggested_deploy_language}`
          )
          .join("\n");

  return `<current_state>
Turn number (interviewer turns so far): ${turnNumber}
Minutes elapsed: ${minutesElapsed}
Active objective: ${activeObjectiveId ?? "(none yet)"}
stall_turns: ${objectiveStallTurns} (consecutive host turns on this objective without switching)
Completeness snapshot:
${completeness}
Meta-notices deployed so far: count=${deployedNoticesCount}, last at turn ${lastNoticeTurn ?? "never"}
</current_state>

<candidate_meta_notices>
${noticesBlock}
</candidate_meta_notices>

<transcript>
${transcriptBlock}
</transcript>

Decide the next interviewer move and render it as one question. If a STRONG candidate meta-notice fits and the deploy window is open (not first 2 interviewer turns, at least 3 turns since last deploy, not back-to-back), prefer deploying it — use move_type="deploy_meta_notice", move_target=<notice type>, and craft next_utterance based on (but not mechanically copying) the suggested_deploy_language. Return the JSON object specified in the output_format section of the system prompt.`;
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
