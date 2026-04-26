// Capture E (DEMO_SCRIPT.md 1:14–1:34, 20s):
//   The new winning sim emits a SECOND ◆ on host turn 12 with
//   anchor_turn=5 — referencing the Stockholm-as-load-bearing-premise
//   recognition. This functions as the cross-turn callback (the original
//   plan had an explicit ↩ anchor_return chip, but the reframed prompts
//   surface it as a deploy_meta_notice with anchor instead).
//
// Smoothly scrolls into view of host turn 12, the ◆ marker in its audit
// panel, and the next participant reply (turn 13) which lands the
// "permission to not think too carefully" recognition line.
//
// Cost: $0 (read-only).
//
//   npx tsx scripts/capture-e-anchor-return.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
  smoothScrollToY,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";
const WINNING_SESSION = "2026-04-26T06-29-13-996Z";

async function main() {
  const setup = captureSetup("e", "anchor-return");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  await page.goto(`${BASE}/sessions/${WINNING_SESSION}`, {
    waitUntil: "domcontentloaded",
  });
  // Wait for the transcript to render (>=6 host bubbles ⇒ host turn 12 is on page)
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 6,
    null,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(1_200);

  // Scroll smoothly to the second ◆ marker — the one citing turn 5 as anchor
  // (the Stockholm-as-load-bearing-premise notice). Try a few selector
  // candidates so the script is tolerant of UI churn.
  const anchorMarker = page
    .locator('text=/Stockholm.*load-bearing|implied_not_said.*turn.?5|anchors:.*5.*11/i')
    .first();
  await anchorMarker.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const box = await anchorMarker.boundingBox();
  if (box) {
    const centerY = box.y + box.height / 2;
    const targetScrollY = (await page.evaluate(() => window.scrollY)) +
      centerY - 540; // viewport center
    await smoothScrollToY(page, Math.max(0, targetScrollY));
  }
  // Tuned for ~20s total (DEMO_SCRIPT 1:14–1:34 = 20s).
  await page.waitForTimeout(3_500); // hold on the marker

  // Move the cursor onto the marker for tooltip visibility
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 22,
    });
  }
  await page.waitForTimeout(3_500);

  // Now scroll to the participant reply (turn 13) — lands the
  // "permission to not think too carefully" recognition line
  const reply = page
    .getByText(/permission to not think too carefully/)
    .first();
  if (await reply.isVisible().catch(() => false)) {
    await reply.scrollIntoViewIfNeeded();
    await page.waitForTimeout(5_500); // hold on the recognition line
  } else {
    // Fallback: hold longer on the marker if the reply isn't on page
    await page.waitForTimeout(5_500);
  }

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-e failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
