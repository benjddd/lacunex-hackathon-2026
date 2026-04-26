// Capture C (DEMO_SCRIPT.md 0:33–0:53, 20s):
//   Sustained split-screen on /demo?brief=civic-consultation. Drive the
//   participant turns 1, 3, 5 from the new winning sim
//   (session-2026-04-26T04-43-27-086Z) using verbatim text. Watch the host
//   dashboard fill in real time. The conductor's adaptive follow-ups land in
//   the chat pane.
//
// Also covers PEAK 1 (◆ on host turn 4) and the ramp into PEAK 2 (↩ on host
// turn 6) if the conductor reproduces the same moves — the live conductor is
// stochastic, so the recording surface for PEAKS 1/2 is the static session
// page (Capture E) when the live run misses.
//
// Cost: ~$1.50 (≈ 5 conductor + extraction + meta-noticing turns at Opus
// rates with prompt caching).
//
//   npx tsx scripts/capture-c-interview.ts

import { chromium, type Page } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
  typeLikeAHuman,
} from "./lib/capture-helpers.ts";

const BASE = "http://localhost:3000";

// VERBATIM participant turns 1, 3, 5 from the new winning sim
// (session-2026-04-26T04-43-27-086Z). These are the turns that produced
// the ◆ at host turn 4 and the ↩ at host turn 6 in the original sim run.
const PARTICIPANT_TURNS: string[] = [
  // Turn 1
  "Right, yeah—I think the proposal is broadly the right direction, honestly. Air quality's been a real issue here, and we do have too many cars clogging things up. So last time I went in was... must've been two weeks ago? I took the bus actually, which is what I tend to do now on weekdays. I used to drive more regularly, but I've just found it's easier to plan around the bus route—park near the station, hop on. It's a bit longer door-to-door, but you avoid the stress of finding a space, and I suppose in my head I'm already mentally adjusting to what a charge zone would mean anyway.",
  // Turn 3
  "Oh, it was probably about twenty minutes longer overall—maybe forty-five minutes versus twenty-five by car, depending on traffic. And I had to walk to the bus stop first, which adds another ten minutes. But that's the thing, I don't really think of it as \"longer\" anymore because driving in has become this mental negotiation, you know? Will I find parking? Will I get stuck behind delivery lorries? With the bus it's just... predictable. Though I'll be honest, I wouldn't have switched if I didn't already know the charge was coming—I'd have just sat in the queue and complained about it. Now I've made it work, so it feels normal. Last month I met my friend Sarah for coffee in the centre most weeks; we haven't done that in ages now, it's become \"a thing\" where we have to actually plan it rather than just pop in.",
  // Turn 5 (this is the post-◆ admission — strongest single turn for C)
  "That's... fair, actually. I suppose I'm doing a bit of mental gymnastics there, aren't I? The honest answer is the bus isn't easier—it's just what I've decided to do because I know the charge is coming, so I'm making peace with it rather than fighting it. I've reframed it as the sensible choice when really I'm just... adapting preemptively. The predictability part is real, but that doesn't mean I prefer it to a quick drive. I think what I'm doing is telling myself a story where I'm already on board with the change, so the inconvenience feels like a choice rather than something imposed on me.",
];

const TURN_TIMEOUT_MS = 120_000; // Opus conductor on long transcripts can run ~60s

async function countHostBubbles(page: Page): Promise<number> {
  return page.locator(".bg-amber-50.rounded-bl-sm").count();
}

async function sendTurn(page: Page, text: string): Promise<void> {
  const before = await countHostBubbles(page);
  const input = page.locator("textarea").first();
  await typeLikeAHuman(input, text);
  // Brief beat after typing so the viewer can read the message before send
  await page.waitForTimeout(450);
  await input.press("Enter");
  // Wait for a new host bubble (host responded)
  await page.waitForFunction(
    (prev: number) =>
      document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
    before,
    { timeout: TURN_TIMEOUT_MS }
  );
  // Hold on the rendered host response before the next turn
  await page.waitForTimeout(2_000);
}

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
  // Wait for conductor turn 0
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1_500); // beat for split-screen to settle

  for (const t of PARTICIPANT_TURNS) {
    await sendTurn(page, t);
  }

  // Hold on the final state for 3s so the editor has tail room
  await page.waitForTimeout(3_000);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-c failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
