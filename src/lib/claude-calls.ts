import { getAnthropic } from "./anthropic";
import { MODELS } from "./models";
import {
  buildConductorSystem,
  buildConductorUser,
  parseConductorOutput,
} from "./prompts/conductor";
import {
  buildExtractionSystem,
  buildExtractionUser,
  parseExtractionOutput,
} from "./prompts/extraction";
import {
  buildTakeawaySystem,
  buildTakeawayUser,
} from "./prompts/takeaway";
import {
  buildMetaNoticingSystem,
  buildMetaNoticingUser,
  parseMetaNoticingOutput,
  type MetaNotice,
} from "./prompts/meta-noticing";
import {
  buildAggregateSystem,
  buildAggregateUser,
  parseAggregateOutput,
  type AggregateInputSession,
} from "./prompts/aggregate";
import type { RoundAggregate } from "./types";
import type {
  ConductorDecision,
  ExtractionState,
  Template,
  Turn,
} from "./types";
import { DEFAULT_ROLE_LABELS } from "./types";

// Kept generous — truncation mid-JSON produces a parse error and kills the turn.
// If a turn's output exceeds these, bump them. See "Unterminated string in JSON"
// errors in the dev log as the canonical signal.
const CONDUCTOR_MAX_TOKENS = 1200;
const EXTRACTION_MAX_TOKENS = 6000;
const TAKEAWAY_MAX_TOKENS = 2500;
const META_NOTICING_MAX_TOKENS = 2000;
const AGGREGATE_MAX_TOKENS = 8000; // N sessions + patterns + quotes = larger output

function textFromMessage(content: Array<{ type: string; text?: string }>): string {
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string") return block.text;
  }
  throw new Error("No text block in model response");
}

export async function callConductor(params: {
  template: Template;
  transcript: Turn[];
  extraction: ExtractionState;
  activeObjectiveId: string | null;
  turnNumber: number;
  minutesElapsed: number;
  deployedNoticesCount: number;
  lastNoticeTurn: number | null;
  candidateNotices?: MetaNotice[];
  objectiveStallTurns?: number;
}): Promise<ConductorDecision> {
  const anthropic = getAnthropic();
  const systemText = buildConductorSystem(params.template);
  const userText = buildConductorUser(params);

  // The conductor has a recurring failure mode: occasionally it returns
  // two questions in one turn, which parseConductorOutput rejects via the
  // hard-rule validator. Rather than 500 the live turn, we retry once with
  // an emphatic reminder — cheap under prompt caching since the system block
  // is still warm. If the retry also fails, propagate the error.
  const attempt = async (extraSystemNudge?: string): Promise<ConductorDecision> => {
    const systemBlocks: Array<{
      type: "text";
      text: string;
      cache_control?: { type: "ephemeral" };
    }> = [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (extraSystemNudge) {
      systemBlocks.push({ type: "text", text: extraSystemNudge });
    }
    const t0 = Date.now();
    const response = await anthropic.messages.create({
      model: MODELS.conductor,
      max_tokens: CONDUCTOR_MAX_TOKENS,
      system: systemBlocks,
      messages: [{ role: "user", content: userText }],
    });
    const usage = response.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
    console.log(`[conductor] ${Date.now() - t0}ms | in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens ?? 0} cache_write=${usage.cache_creation_input_tokens ?? 0}`);
    const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
    return parseConductorOutput(raw);
  };

  try {
    return await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("questions in one turn")) {
      console.warn("[callConductor] 2-question violation — retrying once with nudge");
      return await attempt(
        "<critical>Previous attempt included multiple questions in one turn — hard-rule violation. Rewrite so next_utterance contains EXACTLY ONE question mark. Everything before or after must be statement, not question.</critical>"
      );
    }
    throw err;
  }
}

export async function callExtraction(params: {
  template: Template;
  transcript: Turn[];
  currentState: ExtractionState;
}): Promise<ExtractionState> {
  const anthropic = getAnthropic();
  const systemText = buildExtractionSystem(params.template);
  const userText = buildExtractionUser(params);

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODELS.extraction,
    max_tokens: EXTRACTION_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
  });
  const eu = response.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  console.log(`[extraction] ${Date.now() - t0}ms | in=${eu.input_tokens} out=${eu.output_tokens} cache_read=${eu.cache_read_input_tokens ?? 0} cache_write=${eu.cache_creation_input_tokens ?? 0}`);

  const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
  return parseExtractionOutput(raw);
}

export async function callTakeaway(params: {
  template: Template;
  transcript: Turn[];
  extraction: ExtractionState;
  mode?: "preview" | "final";
}): Promise<string> {
  const anthropic = getAnthropic();
  const systemText = buildTakeawaySystem(params.template);
  const participantLabel =
    params.template.role_labels?.participant ?? DEFAULT_ROLE_LABELS.participant;
  const userText = buildTakeawayUser({
    transcript: params.transcript,
    extraction: params.extraction,
    participantLabel,
  });

  const mode = params.mode ?? "final";
  const model = mode === "preview" ? MODELS.takeawayPreview : MODELS.takeaway;

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model,
    max_tokens: TAKEAWAY_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
  });
  const tu = response.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  console.log(`[takeaway:${mode}] ${Date.now() - t0}ms | model=${model} in=${tu.input_tokens} out=${tu.output_tokens} cache_read=${tu.cache_read_input_tokens ?? 0} cache_write=${tu.cache_creation_input_tokens ?? 0}`);

  // Plain markdown, not JSON. Strip any fences the model might sneak in.
  const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
  return raw.trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/```$/, "").trim();
}

// Meta-noticing: observation-only call that runs after each participant turn
// and returns zero or more candidate notices. The prompt encodes a hard rule
// (see prompts/meta-noticing.ts) and `parseMetaNoticingOutput` rejects
// notices that fail the orchestrator-level kill rule (ex: fewer than 2
// distinct transcript_anchors for non-exempt notice types).
//
// Wired into /api/turn: runs in parallel with extraction once the participant
// has spoken at least twice and the latest turn is substantive. Candidates
// are handed to the conductor, which decides whether to deploy.
export async function callMetaNoticing(params: {
  template: Template;
  transcript: Turn[];
  alreadyDeployed: { turn: number; type: string }[];
}): Promise<MetaNotice[]> {
  const anthropic = getAnthropic();
  const systemText = buildMetaNoticingSystem(params.template);
  const userText = buildMetaNoticingUser({
    transcript: params.transcript,
    alreadyDeployed: params.alreadyDeployed,
  });

  // System prompt is stable within a session → prompt caching, same pattern
  // as conductor/extraction/takeaway.
  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model: MODELS.metaNoticing,
    max_tokens: META_NOTICING_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
  });
  const mu = response.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  console.log(`[meta-noticing] ${Date.now() - t0}ms | in=${mu.input_tokens} out=${mu.output_tokens} cache_read=${mu.cache_read_input_tokens ?? 0} cache_write=${mu.cache_creation_input_tokens ?? 0}`);

  const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
  return parseMetaNoticingOutput(raw);
}

// Cross-participant aggregation: given N sessions run against the same brief,
// produce the cohort-level RoundAggregate. Uses Opus 4.7 — this is one-shot
// per round, quality matters, cost is not a hot path.
//
// Input size: O(N * transcript_size). For N=20 * ~2000 tokens/transcript that
// approaches but stays under Opus 4.7 context. If we hit ceilings, options
// include summarising per-session first (two-stage) or batching. Start simple.
export async function callAggregate(params: {
  template: Template;
  sessions: AggregateInputSession[];
}): Promise<RoundAggregate> {
  if (params.sessions.length === 0) {
    throw new Error("callAggregate requires at least one session");
  }
  const anthropic = getAnthropic();
  const systemText = buildAggregateSystem(params.template);
  const userText = buildAggregateUser(params.sessions);

  const response = await anthropic.messages.create({
    model: MODELS.takeaway, // reuse Opus 4.7 pointer; aggregation is quality-over-speed
    max_tokens: AGGREGATE_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userText }],
  });

  const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
  return parseAggregateOutput(raw);
}
