import { NextResponse } from "next/server";
import { callTakeaway } from "@/lib/claude-calls";
import { getTemplate } from "@/lib/templates";
import type { ExtractionState, Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface TakeawayRequest {
  templateId: string;
  transcript: Turn[];
  extraction: ExtractionState;
}

export async function POST(req: Request) {
  let body: TakeawayRequest;
  try {
    body = (await req.json()) as TakeawayRequest;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const template = getTemplate(body.templateId);
  if (!template) {
    return NextResponse.json(
      { error: `unknown template: ${body.templateId}` },
      { status: 400 }
    );
  }
  if (!body.transcript || body.transcript.length < 2) {
    return NextResponse.json(
      { error: "transcript too short for a takeaway" },
      { status: 400 }
    );
  }

  try {
    const markdown = await callTakeaway({
      template,
      transcript: body.transcript,
      extraction: body.extraction,
    });
    return NextResponse.json({ markdown });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/takeaway] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
