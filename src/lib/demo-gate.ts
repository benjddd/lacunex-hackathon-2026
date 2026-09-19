import { NextResponse } from "next/server";

// Returns a 503 Response when DEMO_DISABLED=true, else null.
// Routes that touch a paid API call this at the very top to fail closed
// before any model billing can happen. The returned JSON shape mirrors
// the rest of the API: callers already render `userMessage` if present.
export function demoGate(): Response | null {
  if (process.env.DEMO_DISABLED === "true") {
    return NextResponse.json(
      {
        error: "demo_disabled",
        userMessage:
          "This demo is switched off — the hackathon is over. The repo and Making-of are still readable.",
      },
      { status: 503 }
    );
  }
  return null;
}
