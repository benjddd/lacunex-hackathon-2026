import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/models";
import { checkRateLimit } from "@/lib/rate-limit";
import { hostedSaveGeneratedBrief } from "@/lib/store-hosted";
import { demoGate } from "@/lib/demo-gate";
import type { Template } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM = `You are an interview brief designer. Given a host's description of what they want to learn from a conversation, you produce a structured interview brief in JSON.

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

interface GenerateRequest {
  description: string;
}

export async function POST(req: Request) {
  const gated = demoGate();
  if (gated) return gated;

  const rl = await checkRateLimit(req, "moderate");
  if (!rl.ok && rl.response) return rl.response;

  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.description?.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (body.description.length > 500) {
    return NextResponse.json({ error: "description too long (max 500 chars)" }, { status: 400 });
  }

  const userMsg = `Design an interview brief for this use case:\n\n${body.description.trim()}`;

  let generated: Partial<Template>;
  try {
    const response = await anthropic.messages.create({
      model: MODELS.conductor,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: userMsg }],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    // Strip markdown fences + trailing commas before parsing — Opus
    // occasionally wraps the JSON despite the prompt forbidding both.
    let s = text.trim();
    if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    try {
      generated = JSON.parse(s) as Partial<Template>;
    } catch {
      const repaired = s.replace(/,\s*([}\]])/g, "$1");
      generated = JSON.parse(repaired) as Partial<Template>;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 });
  }

  if (!generated.name || !generated.objectives || !Array.isArray(generated.objectives)) {
    return NextResponse.json({ error: "Generated brief missing required fields" }, { status: 500 });
  }

  // Structural defaults — generation only covers semantic content
  const template: Template = {
    template_id: `gen-${Date.now()}`,
    version: "1.0",
    name: generated.name,
    description: generated.description ?? "",
    role_labels: generated.role_labels ?? { host: "Researcher", participant: "Expert" },
    domain_context: generated.domain_context,
    objectives: generated.objectives as Template["objectives"],
    interviewer_persona: {
      voice: "Curious, precise, and unhurried. Plain language. Warm in the way a senior colleague who respects the person's expertise is warm — not a coach, not a therapist. You follow the thread, not the script.",
      stance: "Assume the participant has thought about this more than you have. Your job is to surface what they know, not to teach or advise. Ask the thing they haven't been asked yet.",
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
      closing: "When key objectives are met or time is up, close with a brief acknowledgement of what was covered.",
    },
    meta_noticing_layer: {
      description: "Separate observation-only call after each participant turn.",
      notice_types: [
        {
          id: "contradiction",
          description: "A statement conflicts with a prior statement.",
          deploy_as: "Earlier you said X — help me understand how that fits with what you just said.",
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
        { id: "what_sharpened", label: "What got sharper", contents: "2–4 specific things the participant clarified during the session." },
        { id: "surfaced_assumptions", label: "Assumptions worth examining", contents: "3–5 load-bearing assumptions from the conversation." },
        { id: "what_you_already_have_that_is_relevant", label: "What you already have", contents: "Resources or working knowledge the participant mentioned that could be redeployed." },
        { id: "open_questions", label: "Questions to sit with", contents: "3–5 questions the session raised but didn't resolve." },
        { id: "one_experiment", label: "One concrete next step", contents: "A single time-boxed action to test the most important untested assumption." },
      ],
      tone: "Reflective, second person, warm but dry. Something the participant would want to keep.",
    },
  };

  // Persist server-side so cross-tab/cross-device access to /p/{template_id}
  // works without sessionStorage. 24h TTL is plenty for the hackathon demo
  // window. Non-fatal if KV is down — sessionStorage path still works.
  try {
    await hostedSaveGeneratedBrief(template);
  } catch (err) {
    console.error("[generate-brief] hostedSaveGeneratedBrief failed:", err);
  }

  return NextResponse.json({ template });
}
