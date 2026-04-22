import type { ExtractionState, Template, Turn } from "@/lib/types";

// End-of-session synthesis. Runs once. Closes the session for the participant.
// This is the bilateral-value proof — the host's evidence is the dashboard;
// the participant's evidence is this artifact. If this reads generic, the
// whole "both sides leave with something" thesis collapses.
//
// Tone discipline (non-negotiable):
//   - Second person throughout.
//   - Reflective, not prescriptive. "You moved from X to Y" — never "You should".
//   - No life advice. No consultant-speak. No motivational closers.
//   - Specific to this conversation. Quotes/paraphrases real exchanges.
//   - Dry warmth — never saccharine.
//   - Open questions are a feature; do not resolve what the session did not.

export function buildTakeawaySystem(template: Template): string {
  const sections = template.takeaway_artifact.sections
    .map(
      (s) =>
        `- id: ${s.id}\n  label: ${s.label}\n  contents: ${s.contents}`
    )
    .join("\n");

  return `<role>
You are writing a reflective takeaway for the participant of an adaptive interview that just concluded. This document is for them, not the host. It is their artifact — something they should want to keep.

Warm but dry. Specific. Honest. Reflective, not prescriptive. You are reflecting back what the participant themselves surfaced during the conversation — not giving advice from above.
</role>

<artifact_tone>
${template.takeaway_artifact.tone}
</artifact_tone>

<sections_to_produce>
${sections}
</sections_to_produce>

<hard_rules>
- Second person throughout ("you", "your"). Never third person.
- Specific to the actual conversation. Paraphrase or quote real exchanges; no generic bullets.
- Honest about what shifted and what didn't. If the participant's conviction on a point weakened during the session, name it. If it held, name that too.
- No advice. No "you should". No "consider doing X". This is reflection, not prescription.
- No motivational closers. No "trust the process". No "you've got this".
- Open questions are a feature. Do not resolve what the conversation did not resolve. Leave the participant with good questions, not fake answers.
- The "one cheap experiment this week" (if the template asks for it) must be: (a) concrete, (b) time-boxed, (c) executable by the participant alone, (d) targeted at the single most load-bearing untested thing surfaced in the session.
- Keep the whole artifact readable in under 3 minutes.
- If a section's evidence in the transcript is thin, write a short honest section — do not pad.
</hard_rules>

<forbidden>
- "Based on our conversation..." (too process-y).
- "It seems like you might want to consider..." (hedged advice).
- Motivational-poster closers.
- Any content not grounded in the transcript.
- Bullet points that could apply to any interview.
- Therapy-speak.
</forbidden>

<output_format>
Return Markdown only. No JSON wrapper, no preamble. Start directly with a short title line (## CaptainSubtext — your reflection), then one-sentence dateline, then the sections with level-3 headings using the section labels from the template.

Do not include the section ids.
</output_format>`;
}

export function buildTakeawayUser(params: {
  transcript: Turn[];
  extraction: ExtractionState;
  participantLabel: string;
}): string {
  const { transcript, extraction, participantLabel } = params;
  const transcriptBlock = transcript
    .map(
      (t) =>
        `[${t.index}] ${t.role === "host" ? "Host" : participantLabel}: ${t.text}`
    )
    .join("\n");

  return `<transcript>
${transcriptBlock}
</transcript>

<final_extraction_state>
${JSON.stringify(extraction, null, 2)}
</final_extraction_state>

Write the takeaway artifact now. Markdown only, no preamble.`;
}
