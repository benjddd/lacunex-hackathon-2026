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
import type {
  ConductorDecision,
  ExtractionState,
  Template,
  Turn,
} from "./types";

const CONDUCTOR_MAX_TOKENS = 600;
const EXTRACTION_MAX_TOKENS = 2000;

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
}): Promise<ConductorDecision> {
  const anthropic = getAnthropic();
  const systemText = buildConductorSystem(params.template);
  const userText = buildConductorUser(params);

  // The system prompt is identical every turn within a session → mark for caching.
  const response = await anthropic.messages.create({
    model: MODELS.conductor,
    max_tokens: CONDUCTOR_MAX_TOKENS,
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
  return parseConductorOutput(raw);
}

export async function callExtraction(params: {
  template: Template;
  transcript: Turn[];
  currentState: ExtractionState;
}): Promise<ExtractionState> {
  const anthropic = getAnthropic();
  const systemText = buildExtractionSystem(params.template);
  const userText = buildExtractionUser(params);

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

  const raw = textFromMessage(response.content as Array<{ type: string; text?: string }>);
  return parseExtractionOutput(raw);
}
