// Capture H2 (DEMO_SCRIPT_v2.md Beat 9, ~7s):
//   /p/brief-designer mid-conversation — the conductor asking the host a
//   clarifying question about the brief they're authoring; host's reply
//   visible. The recursive dog-food beat ("the platform interviews the host
//   who designs the next interview").
//
// This complements capture-h-brief-designer.ts (the static reveal of the
// /host hub). For v2's Beat 9 we want a live designer turn, not a card hover.
//
// Cost: ~$1 (one designer turn = one conductor + extraction + meta-noticing
// pass at Opus rates with prompt caching).
//
//   npx tsx scripts/capture-h2-brief-designer-mid.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";

// Host's reply to the brief-designer's opening question. Picks a plausibly
// real research scenario so the designer's follow-up question lands as a
// genuine clarification, not a canned response. Verbatim drives the visible
// chat content for the 7s capture.
const HOST_REPLY: string =
  "I want to understand how senior engineers think about technical debt — specifically what they wish leadership understood about it but rarely manages to say in performance reviews.";

const TURN_TIMEOUT_MS = 120_000;

async function main() {
  const setup = captureSetup("h2", "brief-designer-midconversation");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  // /p/brief-designer is the participant route bound to the brief-designer
  // template. The "participant" here is actually the host being interviewed
  // by the platform to author a new brief — the recursive dog-food path.
  await page.goto(`${BASE}/p/brief-designer`, { waitUntil: "domcontentloaded" });

  // Wait for the conductor's opening question (host-turn = the platform
  // asking the host).
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1_500); // settle so the opener is fully rendered

  const input = page.locator("textarea").first();
  const before = await page.locator(".bg-amber-50.rounded-bl-sm").count();
  await input.fill(HOST_REPLY);
  await page.waitForTimeout(1_500); // viewer reads the host's typed reply

  // Hover send briefly (eye-catch), then submit.
  const send = page.locator('button:has-text("Send"), button[type="submit"]').first();
  if (await send.isVisible().catch(() => false)) {
    await send.hover();
    await page.waitForTimeout(300);
    await send.click();
  } else {
    await input.press("Enter");
  }

  // Wait for the conductor's follow-up question to land. This is the moment
  // the capture wants to hold on — the platform asking a clarifying question
  // about the brief itself.
  await page.waitForFunction(
    (prev: number) =>
      document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
    before,
    { timeout: TURN_TIMEOUT_MS }
  );

  // Hold on the new question for ~3s so the viewer can read it.
  await page.waitForTimeout(3_500);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(
    `capture-h2 failed: ${err instanceof Error ? err.message : String(err)}\n`
  );
  process.exit(1);
});
