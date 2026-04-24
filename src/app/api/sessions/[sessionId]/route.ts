import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { hostedGetSession, hostedGetTakeaway } from "@/lib/store-hosted";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ sessionId: string }>;
}

// Returns the full session payload + the takeaway markdown if a paired
// takeaway-<sessionId>.md exists. Dev-only (reads from transcripts/ on disk).
export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;
  // Reject path-traversal attempts — sessionId is an ISO-like timestamp.
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  if (process.env.VERCEL) {
    const session = await hostedGetSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "session not found" }, { status: 404 });
    }
    const takeaway = await hostedGetTakeaway(sessionId);
    return NextResponse.json({ session, takeaway });
  }

  const dir = path.join(process.cwd(), "transcripts");
  const sessionPath = path.join(dir, `session-${sessionId}.json`);
  const takeawayPath = path.join(dir, `takeaway-${sessionId}.md`);

  let sessionJson: unknown;
  try {
    const raw = await fs.readFile(sessionPath, "utf-8");
    sessionJson = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `session not found: ${msg}` },
      { status: 404 }
    );
  }

  let takeawayMarkdown: string | null = null;
  try {
    takeawayMarkdown = await fs.readFile(takeawayPath, "utf-8");
  } catch {
    // No paired takeaway — that's fine.
  }

  return NextResponse.json({
    session: sessionJson,
    takeaway: takeawayMarkdown,
  });
}
