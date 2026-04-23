import { NextResponse } from "next/server";
import { createRound, listRounds } from "@/lib/rounds";
import { getTemplate } from "@/lib/templates";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rounds = await listRounds();
    return NextResponse.json({ rounds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface CreateRoundBody {
  templateId: string;
  label: string;
  targetParticipantCount?: number | null;
  note?: string | null;
  sessionIds?: string[];
}

export async function POST(req: Request) {
  let body: CreateRoundBody;
  try {
    body = (await req.json()) as CreateRoundBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }
  if (!body.label || body.label.trim().length === 0) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  if (!getTemplate(body.templateId)) {
    return NextResponse.json(
      { error: `unknown brief: ${body.templateId}` },
      { status: 400 }
    );
  }
  try {
    const round = await createRound({
      templateId: body.templateId,
      label: body.label,
      targetParticipantCount: body.targetParticipantCount ?? null,
      note: body.note ?? null,
      sessionIds: body.sessionIds ?? [],
    });
    return NextResponse.json({ round });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/rounds] create failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
