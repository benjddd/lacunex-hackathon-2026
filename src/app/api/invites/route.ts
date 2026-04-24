import { NextResponse } from "next/server";
import { createInvite } from "@/lib/invites";
import { getTemplate } from "@/lib/templates";

export const runtime = "nodejs";

interface CreateInviteBody {
  templateId: string;
  note?: string | null;
}

export async function POST(req: Request) {
  let body: CreateInviteBody;
  try {
    body = (await req.json()) as CreateInviteBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }
  if (!getTemplate(body.templateId)) {
    return NextResponse.json(
      { error: `unknown brief: ${body.templateId}` },
      { status: 400 }
    );
  }
  try {
    const invite = await createInvite({
      templateId: body.templateId,
      note: body.note ?? null,
    });
    return NextResponse.json({ invite });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/invites] create failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
