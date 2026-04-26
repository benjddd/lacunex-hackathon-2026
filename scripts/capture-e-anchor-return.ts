// Capture E (DEMO_SCRIPT.md 1:14–1:34, 20s):
//   ↩ amber chip on host turn 6 pointing back to turn 3 (Sarah-coffee). The
//   recording surface is the static winning-sim session page where the
//   chips render reliably from persisted metadata.
//
// Smoothly scrolls into view of host turn 6, the ↩ marker in its audit panel,
// and a held shot on the chip + the next participant reply (turn 7) which
// lands on screen as the column-mutation moment.
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
} from "./lib/capture-helpers.ts";

const BASE = "http://localhost:3000";
const WINNING_SESSION = "2026-04-26T04-43-27-086Z";

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
  // Wait for the transcript to render (>=5 host bubbles ⇒ turn 8 is on page)
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 5,
    null,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(1_200);

  // Scroll smoothly to the ↩ marker — it lives inside the per-turn audit
  // panel right under host turn 6. The audit panel defaults to open, so the
  // marker is in the DOM immediately.
  const anchorMarker = page.getByText(/↩ re-opened turn 3/).first();
  await anchorMarker.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  // Center the anchor marker in the viewport using a smooth scroll
  const box = await anchorMarker.boundingBox();
  if (box) {
    const centerY = box.y + box.height / 2;
    const targetScrollY = (await page.evaluate(() => window.scrollY)) +
      centerY - 540; // viewport center
    await smoothScrollToY(page, Math.max(0, targetScrollY));
  }
  await page.waitForTimeout(2_500); // hold on the chip

  // Move the cursor onto the chip for tooltip visibility
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 14,
    });
  }
  await page.waitForTimeout(2_500);

  // Now scroll to the participant reply (turn 7) — lands the
  // "spontaneous trips become planned trips" line that closes the beat
  const reply = page.getByText(/spontaneous trips have become planned trips/).first();
  if (await reply.isVisible().catch(() => false)) {
    await reply.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3_000);
  }

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-e failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
