// Capture C (DEMO_SCRIPT.md 0:33–0:53, 20s):
//   Sustained split-screen on /demo?brief=civic-consultation. Drive the
//   participant turns 1, 3, 5 from the new winning sim
//   (session-2026-04-26T06-29-13-996Z) using verbatim text. Watch the host
//   dashboard fill in real time. The conductor's adaptive follow-ups land in
//   the chat pane.
//
// Also covers PEAK 1 (◆ on host turn 4) and the ramp into PEAK 2 (second ◆
// on host turn 12, with anchor=5) if the conductor reproduces the same
// moves — the live conductor is stochastic, so the recording surface for
// PEAKS 1/2 is the static session page (Capture E) when the live run misses.
//
// Cost: ~$1.50 (≈ 5 conductor + extraction + meta-noticing turns at Opus
// rates with prompt caching).
//
//   npx tsx scripts/capture-c-interview.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";

// Tuned for ~20s total runtime (DEMO_SCRIPT 0:33–0:53 = 20s). The 20s slot
// can't accommodate three full verbatim sim turns at human pace (each ~590
// chars × 60ms ≈ 35s of typing alone). For Capture C the focus is "split-
// screen, columns visibly rising" — a single short cycle is sufficient.
// We pre-fill via fill() (treat as off-camera typing) then send and let the
// dashboard fill on Opus's response.
const PARTICIPANT_TURN: string =
  "Right, yeah — broadly the right direction. Last weekday I drove into the centre but parked in one of the outer car parks rather than trying to find something closer. I'm already thinking about avoiding peak times. Little workarounds I haven't really thought about.";

const TURN_TIMEOUT_MS = 120_000; // Opus conductor on long transcripts can run ~60s

async function main() {
  const setup = captureSetup("c", "interview-split-screen");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  await page.goto(`${BASE}/demo?brief=civic-consultation`, {
    waitUntil: "domcontentloaded",
  });
  // Wait for conductor turn 0 (~3s)
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1_500); // settle on split-screen (1.5s)

  // Pre-fill the participant turn (treat as off-camera typing) then a brief
  // pause so the viewer reads it before send (~2s).
  const input = page.locator("textarea").first();
  const before = await page.locator(".bg-amber-50.rounded-bl-sm").count();
  await input.fill(PARTICIPANT_TURN);
  await page.waitForTimeout(2_000);

  // Hover the send button briefly to draw the eye, then submit (~0.5s).
  const send = page.locator('button:has-text("Send"), button[type="submit"]').first();
  if (await send.isVisible().catch(() => false)) {
    await send.hover();
    await page.waitForTimeout(300);
    await send.click();
  } else {
    await input.press("Enter");
  }

  // Wait for the host response (variable: typically 8–14s with prompt cache)
  await page.waitForFunction(
    (prev: number) =>
      document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
    before,
    { timeout: TURN_TIMEOUT_MS }
  );

  // Hold on the filled dashboard + new host bubble (~5s)
  await page.waitForTimeout(5_000);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-c failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
