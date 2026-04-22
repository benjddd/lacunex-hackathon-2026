import type { ExtractionState, Template, Turn } from "@/lib/types";

// The extraction system prompt. Mechanical, disciplined, non-creative.
// Static within a session → cache-friendly.
export function buildExtractionSystem(template: Template): string {
  const schemaBlock = template.objectives
    .map((o) => {
      const fields = Object.entries(o.extraction_schema)
        .map(([k, v]) => `    ${k}: ${String(v)}`)
        .join("\n");
      return [
        `- objective: ${o.id}  (${o.label})`,
        `  goal: ${o.goal}`,
        `  success_criteria: ${o.success_criteria}`,
        `  schema:`,
        fields,
      ].join("\n");
    })
    .join("\n\n");

  return `<role>
You extract structured data from an ongoing interview transcript. You do not interview. You do not suggest questions. You do not generate prose beyond what the schema requests.

Your output is machine-read and rendered on a live dashboard for the host. It must be accurate, schema-valid, and conservative.
</role>

<objectives_and_schemas>
${schemaBlock}
</objectives_and_schemas>

<rules>
- Update only fields for which the transcript now supports a value or a change.
- Preserve prior values when no new evidence exists. Do not overwrite without cause.
- For quote fields, extract verbatim from the transcript and include the turn index.
- For confidence fields, start low and raise only with clear evidence. The cost of false confidence is higher than the cost of under-claiming.
- Never fabricate. If a field is not supported by the transcript, leave it null or retain its prior value.
- For completeness per objective, use the success criteria as your benchmark. Return a 0–1 value.
- Return the full state object, not a diff.
</rules>

<output_format>
Return a single JSON object and nothing else — no markdown, no prose before or after:
{
  "per_objective": {
    "<objective_id>": {
      "id": "<objective_id>",
      "fields": { ...schema fields that are supported by evidence... },
      "completeness": <0..1>,
      "confidence": <0..1>,
      "key_quotes": [{ "turn": <int>, "text": "<verbatim>" }]
    }
    // ... one entry per objective ...
  },
  "cross_objective": {
    "emerging_themes": ["<theme>"],
    "session_heat": "<one-sentence pointer to where the signal is richest right now>"
  }
}
</output_format>`;
}

export function buildExtractionUser(params: {
  transcript: Turn[];
  currentState: ExtractionState;
}): string {
  const { transcript, currentState } = params;
  const transcriptBlock = transcript
    .map((t) => `[${t.index}] ${t.role === "host" ? "Host" : "Participant"}: ${t.text}`)
    .join("\n");

  return `<current_state>
${JSON.stringify(currentState, null, 2)}
</current_state>

<transcript>
${transcriptBlock}
</transcript>

Update the state and return the full JSON object specified in the output_format section of the system prompt.`;
}

export function parseExtractionOutput(raw: string): ExtractionState {
  const cleaned = raw.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as ExtractionState;
  if (!parsed.per_objective || typeof parsed.per_objective !== "object") {
    throw new Error("Extraction response missing per_objective");
  }
  if (!parsed.cross_objective) {
    parsed.cross_objective = { emerging_themes: [], session_heat: "" };
  }
  return parsed;
}
