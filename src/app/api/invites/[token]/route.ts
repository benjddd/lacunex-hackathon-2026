import { NextResponse } from "next/server";
import { resolveInvite } from "@/lib/invites";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const invite = await resolveInvite(token);
  if (!invite) {
    return NextResponse.json({ error: "invite not found" }, { status: 404 });
  }
  return NextResponse.json({ invite });
}
