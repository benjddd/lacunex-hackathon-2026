import type { ExtractionState, RoundAggregate, Template, Turn } from "@/lib/types";

// Cross-participant aggregation. Given N sessions run against the same brief,
// produce a RoundAggregate — patterns across participants, themes, signal
// strength per objective, routing recommendations.
//
// This is the feature that genuinely demonstrates the "comparable signal
// across N conversations" claim. Competitors ship one-off transcripts;
// our output is a cohort picture drawn from individually-adaptive sessions.

export function buildAggregateSystem(template: Template): string {
  const objectiveBlock = template.objectives
    .map((o) => `- ${o.id}: ${o.label} (${o.priority})\n    goal: ${o.goal}`)
    .join("\n");

  return `<role>
You aggregate structured insight across N interview sessions run against the same brief. You do not summarize one interview — you find the PATTERNS that only emerge when the cohort is viewed together. The host will see this as their cohort-level picture.

You receive: the brief (same for every session), and one transcript + final extraction state per session. You return a structured aggregate.
</role>

<brief_objectives>
${objectiveBlock}
</brief_objectives>

<pattern_types>
- convergent_problem: most participants name the same pain or problem — strong signal of a shared reality
- divergent_framing: participants agree a topic matters but disagree about what the problem IS — reveals hidden definitional work
- shared_assumption: an assumption appears in many sessions, usually untested — load-bearing for the cohort
- recurring_hedge: same hedge pattern across multiple participants on the same topic — collective ambivalence
- outlier: one participant's strong signal diverges from the cohort — worth surfacing, not suppressing
- unasked_across_cohort: a thing the brief should probe that no session raised — gap for the next round
</pattern_types>

<rules>
- Cite specific session_ids in supporting_session_ids. A pattern needs ≥2 sessions (outlier is exempt — it's explicitly one session).
- Quote verbatim from transcripts in sample_quotes — never paraphrase. Cite turn index.
- Be conservative about "strong" vs "weak" patterns. Strong = 3+ sessions evidencing it clearly. Weak = 2 sessions OR fuzzier signal.
- Signal strength per objective (0..1): how much of the objective's success criteria is satisfied across the cohort (not per session — aggregate).
- Routing recommendations: surface when the cohort's findings meaningfully concern an audience the host didn't originally scope (e.g., "you asked about product-fit but participants kept surfacing pricing anxiety — worth looping in the pricing lead"). Only produce when the finding is genuinely load-bearing for another audience.
- Top themes: 5-10 short theme labels that name the cohort's content. Not features we wish were there.
- The summary paragraph is the first thing the host reads. Make it specific to this cohort. No generic opening.
</rules>

<output_format>
Return a single JSON object:
{
  "generated_at": "<ISO timestamp>",
  "session_count": <int>,
  "summary": "<1-paragraph narrative specific to this cohort, ~80-150 words>",
  "top_themes": ["<short theme label>", ...],
  "signal_strength_by_objective": { "<objective_id>": <0..1>, ... },
  "patterns": [
    {
      "type": "convergent_problem | divergent_framing | shared_assumption | recurring_hedge | outlier | unasked_across_cohort",
      "strength": "strong | weak",
      "summary": "<1-2 sentences>",
      "supporting_session_ids": ["<id>", ...],
      "sample_quotes": [ { "session_id": "<id>", "turn": <int>, "text": "<verbatim>" } ]
    }
  ],
  "routing_recommendations": [
    {
      "audience": "<who should hear this>",
      "finding": "<what specifically they'd want to know>",
      "supporting_session_ids": ["<id>", ...]
    }
  ]
}

No prose outside the JSON.
</output_format>`;
}

export interface AggregateInputSession {
  session_id: string;
  transcript: Turn[];
  extraction: ExtractionState;
}

export function buildAggregateUser(sessions: AggregateInputSession[]): string {
  const blocks = sessions.map((s) => {
    const transcriptBlock = s.transcript
      .map((t) => `[${t.index}] ${t.role === "host" ? "Host" : "Participant"}: ${t.text}`)
      .join("\n");
    const extractionBlock = JSON.stringify(s.extraction, null, 2);
    return `<session id="${s.session_id}">
<transcript>
${transcriptBlock}
</transcript>
<final_extraction>
${extractionBlock}
</final_extraction>
</session>`;
  });

  return `<sessions count="${sessions.length}">
${blocks.join("\n\n")}
</sessions>

Produce the RoundAggregate JSON specified in the output_format section. Generated_at should be the current ISO timestamp.`;
}

export function parseAggregateOutput(raw: string): RoundAggregate {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as RoundAggregate;
  if (!Array.isArray(parsed.patterns)) {
    throw new Error("aggregate response missing patterns array");
  }
  if (!parsed.summary || typeof parsed.summary !== "string") {
    throw new Error("aggregate response missing summary");
  }
  return parsed;
}
