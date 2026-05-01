// POST /api/sessions/[sessionId]/generate-brief
//
// Reads a brief-designer session, distils the participant turns into a
// 200-400 word description of the use case, and calls the same brief
// generation logic as /api/generate-brief. Returns { template }.
//
// The client stores the result in sessionStorage and redirects to /p/[id].

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAnthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import { hostedGetSession, hostedSaveGeneratedBrief } from "@/lib/store-hosted";
import { checkRateLimit } from "@/lib/rate-limit";
import { demoGate } from "@/lib/demo-gate";
import type { Template, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

interface Params {
  params: Promise<{ sessionId: string }>;
}

interface SessionDoc {
  template_id?: string;
  transcript?: Turn[];
}

// ---- Session loading (mirrors research route) ----

async function loadSession(sessionId: string): Promise<SessionDoc | null> {
  if (process.env.VERCEL) {
    const doc = await hostedGetSession(sessionId);
    return (doc as SessionDoc) ?? null;
  }
  try {
    const raw = await fs.readFile(
      path.join(process.cwd(), "transcripts", `session-${sessionId}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as SessionDoc;
  } catch {
    return null;
  }
}

// ---- Distil the transcript into a brief description ----

const DISTIL_SYSTEM = `You are a research assistant. You receive a design conversation where someone described what they want to learn from qualitative interviews. Your job is to distil what they said into a clear 200-400 word description suitable for generating an interview brief.

Write in plain prose. Cover:
1. The domain and the core question they want to answer
2. Who the target participants are (as specifically as they named them)
3. The 2-4 most important things they want to learn
4. Any hypotheses or beliefs they want to test

Write only the description — no headers, no commentary. Use second person only for "the host wants to…" phrasing. Do not invent details not stated in the conversation.`;

async function distilTranscript(turns: Turn[]): Promise<string> {
  // Extract participant turns only (their side of the design conversation)
  const participantTurns = turns
    .filter((t) => t.role === "participant")
    .map((t, i) => `[Response ${i + 1}]: ${t.text}`)
    .join("\n\n");

  if (!participantTurns.trim()) {
    throw new Error("No participant turns found in transcript");
  }

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.conductor,
    max_tokens: 600,
    system: DISTIL_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is what the host said during the brief design conversation:\n\n${participantTurns}\n\nWrite a clear 200-400 word description of their interview brief requirements.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  if (!text) throw new Error("Distillation returned empty text");
  return text;
}

// Robust JSON parser for the brief generator. Opus 4.7 occasionally wraps
// output in markdown fences or emits a trailing comma despite the prompt
// forbidding both — log the raw text for inspection and try common repairs
// before giving up.
function parseBriefJson(raw: string): Partial<Template> {
  // Strip leading/trailing whitespace and common markdown fences.
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // First attempt — strict.
  try {
    return JSON.parse(s) as Partial<Template>;
  } catch (firstErr) {
    // Repair: remove trailing commas before } or ].
    const repaired = s.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(repaired) as Partial<Template>;
    } catch {
      // Surface the original failure with a snippet of what we got, so the
      // server log shows what to fix in the prompt next time.
      const snippet = s.slice(0, 240).replace(/\n/g, "\\n");
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      throw new Error(`Generated JSON unparseable (${msg}). Raw start: ${snippet}…`);
    }
  }
}

// ---- Generate brief from description (replicates /api/generate-brief logic) ----

const GENERATE_SYSTEM = `You are an interview brief designer. Given a host's description of what they want to learn from a conversation, you produce a structured interview brief in JSON.

Output ONLY valid JSON matching this exact schema — no explanation, no markdown fences:

{
  "name": "Brief name (3-6 words)",
  "description": "One sentence describing the purpose and context (30-50 words)",
  "role_labels": { "host": "Host role title (e.g. Researcher)", "participant": "Participant role title (e.g. Resident)" },
  "objectives": [
    {
      "id": "snake_case_id",
      "label": "Short display label (2-4 words)",
      "priority": "high" | "medium" | "low",
      "goal": "What this objective is trying to learn (1 sentence)",
      "sub_questions": ["Specific probe question 1", "Specific probe question 2", "Specific probe question 3"],
      "probing_strategies": ["Strategy description 1", "Strategy description 2"],
      "success_criteria": "What does 'done' look like for this objective (1 sentence)",
      "extraction_schema": { "key_field_1": "description", "key_field_2": "description" },
      "meta_notice_hints": ["What kind of subtext to watch for on this objective"]
    }
  ],
  "domain_context": "3-5 key domain facts or frameworks relevant to probing this topic well. Written as operative principles, not academic theory."
}

Rules:
- 3-5 objectives. First two are "high" priority.
- Each objective must have 3 sub_questions and 2 probing_strategies
- extraction_schema should have 3-5 key fields that the conductor should fill in for this objective
- domain_context should be 150-300 words of the most operationally relevant knowledge for an interviewer in this domain
- Role labels should be domain-appropriate (not "Host"/"Participant" — e.g. "Researcher"/"Expert", "Facilitator"/"Resident")`;

async function generateBriefFromDescription(description: string): Promise<Template> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODELS.conductor,
    max_tokens: 4096,
    system: GENERATE_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Design an interview brief for this use case:\n\n${description}`,
      },
    ],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const generated = parseBriefJson(rawText);

  if (!generated.name || !generated.objectives || !Array.isArray(generated.objectives)) {
    throw new Error("Generated brief missing required fields");
  }

  const template: Template = {
    template_id: `gen-${Date.now()}`,
    version: "1.0",
    name: generated.name,
    description: generated.description ?? "",
    role_labels: generated.role_labels ?? { host: "Researcher", participant: "Expert" },
    domain_context: generated.domain_context,
    objectives: generated.objectives as Template["objectives"],
    interviewer_persona: {
      voice:
        "Curious, precise, and unhurried. Plain language. Warm in the way a senior colleague who respects the person's expertise is warm — not a coach, not a therapist. You follow the thread, not the script.",
      stance:
        "Assume the participant has thought about this more than you have. Your job is to surface what they know, not to teach or advise. Ask the thing they haven't been asked yet.",
      forbidden: [
        "More than one question per turn.",
        "Generic validation — 'that's interesting', 'great point'.",
        "Suggesting the answer before they give it.",
        "Therapy-speak.",
      ],
      pacing: "One question at a time. Give space. Silence is not a problem to fill.",
    },
    session_shape: {
      target_duration_minutes: 20,
      demo_duration_minutes: 5,
      opening: "Brief context-setting, then open with the first question. No warmup small-talk.",
      closing:
        "When key objectives are met or time is up, close with a brief acknowledgement of what was covered.",
    },
    meta_noticing_layer: {
      description: "Separate observation-only call after each participant turn.",
      notice_types: [
        {
          id: "contradiction",
          description: "A statement conflicts with a prior statement.",
          deploy_as:
            "Earlier you said X — help me understand how that fits with what you just said.",
        },
        {
          id: "hedging_pattern",
          description: "Multiple hedges or qualifiers on the same claim.",
          deploy_as: "You've softened this a few times — what's underneath that?",
        },
        {
          id: "implied_not_said",
          description: "An assumption is operative but unstated.",
          deploy_as: "It sounds like you're assuming X — is that right?",
        },
        {
          id: "avoidance",
          description: "A direct question has been deflected more than once.",
          deploy_as: "I've asked this a couple of ways. Is something making it hard to answer directly?",
        },
      ],
      deploy_rate_cap: "No more than 1 meta-notice per 3 interviewer turns.",
      suppression_rules: [
        "Do not deploy in the first 2 interviewer turns.",
        "Do not deploy back-to-back.",
      ],
    },
    takeaway_artifact: {
      description: "End-of-session synthesis for the participant.",
      sections: [
        {
          id: "what_sharpened",
          label: "What got sharper",
          contents: "2–4 specific things the participant clarified during the session.",
        },
        {
          id: "surfaced_assumptions",
          label: "Assumptions worth examining",
          contents: "3–5 load-bearing assumptions from the conversation.",
        },
        {
          id: "what_you_already_have_that_is_relevant",
          label: "What you already have",
          contents:
            "Resources or working knowledge the participant mentioned that could be redeployed.",
        },
        {
          id: "open_questions",
          label: "Questions to sit with",
          contents: "3–5 questions the session raised but didn't resolve.",
        },
        {
          id: "one_experiment",
          label: "One concrete next step",
          contents: "A single time-boxed action to test the most important untested assumption.",
        },
      ],
      tone: "Reflective, second person, warm but dry. Something the participant would want to keep.",
    },
  };

  return template;
}

// ---- Route handler ----

export async function POST(req: Request, { params }: Params) {
  const gated = demoGate();
  if (gated) return gated;

  const rl = await checkRateLimit(req, "moderate");
  if (!rl.ok && rl.response) return rl.response;

  const { sessionId } = await params;

  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  const sessionDoc = await loadSession(sessionId);
  if (!sessionDoc) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  if (sessionDoc.template_id !== "brief-designer") {
    return NextResponse.json(
      { error: "only brief-designer sessions can generate a brief" },
      { status: 400 }
    );
  }

  const transcript = sessionDoc.transcript ?? [];
  if (transcript.length === 0) {
    return NextResponse.json({ error: "session has no transcript" }, { status: 400 });
  }

  try {
    // Step 1: distil participant turns into a prose description
    const description = await distilTranscript(transcript);

    // Step 2: generate a full Template JSON from the description
    const template = await generateBriefFromDescription(description);

    // Persist server-side (24h TTL) so /p/{template_id} works across tabs
    // and devices, not only inside the originating sessionStorage.
    try {
      await hostedSaveGeneratedBrief(template);
    } catch (err) {
      console.error("[sessions/generate-brief] hostedSaveGeneratedBrief failed:", err);
    }

    return NextResponse.json({ template });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-brief-from-session] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
