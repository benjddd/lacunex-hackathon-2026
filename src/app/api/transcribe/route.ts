import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Groq hosts Whisper large-v3 on an OpenAI-compatible endpoint. We accept a
// multipart body with a single `audio` field (webm/opus blob from the
// browser's MediaRecorder) and forward it verbatim. Plain fetch — no SDK.
//
// Docs: https://console.groq.com/docs/speech-text
const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "whisper-large-v3";

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, "moderate");
  if (!rl.ok && rl.response) return rl.response;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `invalid multipart body: ${msg}` },
      { status: 400 }
    );
  }

  const audio = incoming.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "missing 'audio' field (expected a Blob)" },
      { status: 400 }
    );
  }
  if (audio.size === 0) {
    return NextResponse.json(
      { error: "audio blob is empty" },
      { status: 400 }
    );
  }

  const languageField = incoming.get("language");
  const language =
    typeof languageField === "string" && languageField.trim().length > 0
      ? languageField.trim()
      : "en";

  // Re-pack into a fresh FormData for the Groq request. We give the file a
  // generic .webm name so Groq's content-type sniffing picks a sensible
  // decoder regardless of what MediaRecorder happened to emit.
  const outbound = new FormData();
  outbound.append("file", audio, "audio.webm");
  outbound.append("model", GROQ_MODEL);
  outbound.append("language", language);
  outbound.append("response_format", "json");

  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outbound,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/transcribe] groq fetch failed:", msg);
    return NextResponse.json(
      { error: `groq request failed: ${msg}` },
      { status: 502 }
    );
  }
  if (!groqRes.ok) {
    let detail = "";
    try {
      detail = await groqRes.text();
    } catch {
      detail = "";
    }
    const trimmed = detail.length > 500 ? detail.slice(0, 500) + "…" : detail;
    return NextResponse.json(
      { error: `groq ${groqRes.status}: ${trimmed || groqRes.statusText}` },
      { status: groqRes.status }
    );
  }

  let payload: unknown;
  try {
    payload = await groqRes.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `groq returned non-JSON response: ${msg}` },
      { status: 502 }
    );
  }

  const text =
    payload && typeof payload === "object" && "text" in payload
      ? (payload as { text?: unknown }).text
      : undefined;
  if (typeof text !== "string") {
    return NextResponse.json(
      { error: "groq response missing 'text' field" },
      { status: 502 }
    );
  }

  return NextResponse.json({ text: text.trim() });
}
