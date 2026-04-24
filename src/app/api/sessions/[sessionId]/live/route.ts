import { NextResponse } from "next/server";
import { hostedGetLiveSession } from "@/lib/store-hosted";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { sessionId } = await params;
  // Reject path-traversal attempts.
  if (!/^[A-Za-z0-9._-]+$/.test(sessionId)) {
    return NextResponse.json({ error: "invalid session id" }, { status: 400 });
  }

  const state = await hostedGetLiveSession(sessionId);
  if (!state) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}
