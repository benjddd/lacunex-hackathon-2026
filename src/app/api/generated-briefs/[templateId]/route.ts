// GET /api/generated-briefs/[templateId]
//
// Returns a server-persisted generated brief by template_id (always
// "gen-{timestamp}"). Lets /p/[templateId] hydrate when the originating tab's
// sessionStorage isn't available — cross-tab, cross-device, or after a tab
// reload that wiped sessionStorage.

import { NextResponse } from "next/server";
import { hostedGetGeneratedBrief } from "@/lib/store-hosted";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ templateId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { templateId } = await params;
  if (!/^gen-[A-Za-z0-9_-]+$/.test(templateId)) {
    return NextResponse.json({ error: "invalid template id" }, { status: 400 });
  }
  const template = await hostedGetGeneratedBrief(templateId);
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ template });
}
