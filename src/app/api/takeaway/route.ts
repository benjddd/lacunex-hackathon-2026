import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
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

// Dev-only persistence: mirrors save-session's transcripts/ directory.
// Will not work on Vercel read-only FS; Fri deploy will switch to a client-
// side download or KV store. See INTERNAL.md §9.
async function persistTakeaway(markdown: string, turnCount: number): Promise<string> {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = `takeaway-${stamp}.md`;
  const dir = path.join(process.cwd(), "transcripts");
  const filepath = path.join(dir, filename);
  const header = `<!-- generated ${now.toISOString()} • ${turnCount} turns -->\n\n`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filepath, header + markdown, "utf-8");
  return `transcripts/${filename}`;
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

    // Best-effort persistence — a write failure must not kill the response.
    let savedPath: string | null = null;
    try {
      savedPath = await persistTakeaway(markdown, body.transcript.length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[/api/takeaway] persistence failed (continuing):", msg);
    }

    return NextResponse.json({ markdown, savedPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/takeaway] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
