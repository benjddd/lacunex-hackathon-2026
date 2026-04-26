// Capture C2 (DEMO_SCRIPT_v2.md Beats 4-7, ~67s of demo body):
//   Extended sustained split-screen on /demo?brief=civic-consultation. Drives
//   3 verbatim participant turns from the new winning sim
//   (session-2026-04-26T06-29-13-996Z) so capture-c is long enough to feed:
//     - Beat 4 slide-reveal (~1s of source)
//     - Beat 5 5x-speed window (~65s of source needed → 13s output)
//     - Beat 6 ◆ moment (cross-turn meta-notice fires on host turn 4 in the
//       sim; capture extends past the fire so the panel is on tape)
//
// The original capture-c-interview.ts was tuned for v1's 20s slot (~37s of
// recording, ~5s of usable post-render content). v2's demo body is 67s, so
// capture-c2 records 3 turns instead of 1.
//
// Cost: ~$5-7 (3 conductor + extraction + meta-noticing turns at Opus rates
// with prompt caching).
//
//   npx tsx scripts/capture-c2-interview-extended.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";

// Three verbatim turns from session-2026-04-26T06-29-13-996Z, abbreviated
// where pacing demands. Total typing+response time targets ~70-90s of
// recording so Beat 5's 5x window has enough source material.
const TURNS: string[] = [
  "Right, yeah — broadly the right direction. Last weekday I drove into the centre but parked in one of the outer car parks rather than trying to find something closer. I'm already thinking about avoiding peak times. Little workarounds I haven't really thought about.",
  "It's a few things that have built up. I moved my physio appointment — I was seeing someone in the centre but switched to a practice near the ring road. Then there's my mum-in-law's hospital appointments; she needs driving to the centre on Tuesdays. Just adjustments — but listed out, I've reorganised quite a bit of my week.",
  "That's a fair question, honestly a bit uncomfortable when you put it that way. Each individual thing felt manageable on its own. But you're right — I've made several significant changes based on something that hasn't even happened yet.",
];

const TURN_TIMEOUT_MS = 120_000; // Opus conductor on long transcripts ~60s

async function main() {
  const setup = captureSetup("c2", "interview-extended");
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
  // Wait for conductor turn 0 (opening question)
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1_500); // settle on split-screen

  for (let i = 0; i < TURNS.length; i++) {
    const text = TURNS[i];
    const input = page.locator("textarea").first();
    const before = await page.locator(".bg-amber-50.rounded-bl-sm").count();

    // fill (treat as off-camera typing) + brief pause so the viewer reads
    // the participant's reply
    await input.fill(text);
    await page.waitForTimeout(1_500);

    // hover send briefly, then submit
    const send = page.locator('button:has-text("Send"), button[type="submit"]').first();
    if (await send.isVisible().catch(() => false)) {
      await send.hover();
      await page.waitForTimeout(250);
      await send.click();
    } else {
      await input.press("Enter");
    }

    // wait for the host's response (variable: typically 8-14s with cache)
    await page.waitForFunction(
      (prev: number) =>
        document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
      before,
      { timeout: TURN_TIMEOUT_MS }
    );

    // brief settle so the new question is visible before the next turn
    await page.waitForTimeout(800);
  }

  // hold on the final state for 2s so the editor has a clean tail for the
  // ◆ moment / Beat 6 hold
  await page.waitForTimeout(2_000);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `capture-c2 failed: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
