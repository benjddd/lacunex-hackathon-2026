import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAnthropic } from "@/lib/anthropic";
import { MODELS } from "@/lib/models";
import { hostedGetSession, hostedGetResearch, hostedSaveResearch } from "@/lib/store-hosted";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Params {
  params: Promise<{ sessionId: string }>;
}

interface SessionDoc {
  transcript?: Turn[];
}

const SYSTEM = `You are a post-interview fact-checker for a qualitative research platform. You receive a transcript of an interview session. Your job is to:

1. Identify 3–5 specific, verifiable factual claims made by the participant (skip opinions, feelings, and vague assertions — focus on concrete facts that can be checked: statistics, dates, named events, product features, market claims, regulatory claims).
2. For each claim, run a web search to verify or refute it.
3. Produce a concise Fact-Check Report in markdown.

Report structure:
## Fact-Check Report

For each claim:
**Claim:** [quote or close paraphrase from transcript]
**Verdict:** Supported / Refuted / Unverifiable / Partially supported
**Evidence:** 1–2 sentences summarising what you found, with source names inline (no raw URLs).

End with:
**Coverage note:** [1 sentence on which claim types were NOT checked and why — e.g. opinions, future predictions, internal company data]

Keep the report under 400 words. Do not invent claims not present in the transcript.`;

function transcriptToText(turns: Turn[]): string {
  return turns
    .map((t) => `[${t.role === "host" ? "Interviewer" : "Participant"} turn ${t.index}]: ${t.text}`)
    .join("\n\n");
}

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

async function loadCachedResearch(sessionId: string): Promise<string | null> {
  if (process.env.VERCEL) return hostedGetResearch(sessionId);
  try {
    return await fs.readFile(
      path.join(process.cwd(), "transcripts", `research-${sessionId}.md`),
      "utf-8"
    );
  } catch {
    return null;
  }
}

async function saveResearch(sessionId: string, report: string): Promise<void> {
  if (process.env.VERCEL) {
    await hostedSaveResearch(sessionId, report);
    return;
  }
  await fs.writeFile(
    path.join(process.cwd(), "transcripts", `research-${sessionId}.md`),
    report,
    "utf-8"
  );
}

export async function POST(req: Request, { params }: Params) {
  const rl = await checkRateLimit(req, "expensive");
  if (!rl.ok && rl.response) return rl.response;

  const { sessionId } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  const cached = await loadCachedResearch(sessionId);
  if (cached) return NextResponse.json({ report: cached, cached: true });

  const sessionDoc = await loadSession(sessionId);
  if (!sessionDoc) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const transcript = sessionDoc.transcript ?? [];
  if (transcript.length === 0) {
    return NextResponse.json({ error: "session has no transcript" }, { status: 400 });
  }

  const anthropic = getAnthropic();
  const userText = `Here is the interview transcript:\n\n${transcriptToText(transcript)}\n\nPlease identify the key verifiable claims and check them now.`;

  const t0 = Date.now();
  try {
    const response = await anthropic.messages.create({
      model: MODELS.conductor,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userText }],
    });
    const elapsed = Date.now() - t0;
    const usage = response.usage as { input_tokens: number; output_tokens: number };
    console.log(`[research] ${elapsed}ms | in=${usage.input_tokens} out=${usage.output_tokens}`);

    let report = "";
    for (const block of response.content) {
      if (block.type === "text") report += block.text;
    }
    report = report.trim();

    if (!report) {
      return NextResponse.json({ error: "model returned no text" }, { status: 500 });
    }

    await saveResearch(sessionId, report);
    return NextResponse.json({ report, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[research] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
