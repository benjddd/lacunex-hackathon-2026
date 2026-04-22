import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import { getPersona } from "@/lib/personas";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SimulateRequest {
  personaId: string;
  transcript: Turn[];
}

// Dev-only: reads a persona + full transcript, returns what that persona would
// say next as a participant. The persona is replying TO the host, so in the
// Claude message history the HOST lines are role="assistant" and the
// PARTICIPANT lines are role="user". No structured output — plain text reply.
export async function POST(req: Request) {
  let body: SimulateRequest;
  try {
    body = (await req.json()) as SimulateRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 500 });
  }

  const persona = getPersona(body.personaId);
  if (!persona) {
    return NextResponse.json(
      { error: `unknown persona: ${body.personaId}` },
      { status: 500 }
    );
  }

  const transcript = body.transcript ?? [];

  // Flip roles: from the simulated participant's perspective, the host speaks
  // first and they respond. Host = assistant (the one they're replying to),
  // participant = user (this persona's own prior lines).
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const turn of transcript) {
    messages.push({
      role: turn.role === "host" ? "assistant" : "user",
      content: turn.text,
    });
  }

  // The API requires the last message be a user turn. If the transcript ends
  // with a participant line (shouldn't happen in normal simulation flow), we
  // can't produce a participant reply — bail loudly.
  if (messages.length === 0 || messages[messages.length - 1].role !== "assistant") {
    return NextResponse.json(
      {
        error:
          "transcript must end with a host turn — nothing for the participant to reply to",
      },
      { status: 500 }
    );
  }

  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: MODELS.extraction, // Haiku 4.5 — fast, cheap, fine for persona voice
      max_tokens: 400,
      temperature: 0.8,
      system: persona.system_prompt,
      messages,
    });

    let text = "";
    for (const block of response.content as Array<{ type: string; text?: string }>) {
      if (block.type === "text" && typeof block.text === "string") {
        text = block.text;
        break;
      }
    }
    if (!text) throw new Error("no text block in model response");

    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/simulate-participant] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
