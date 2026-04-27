// Capture G2 (DEMO_SCRIPT_v2.md Beat 1, 21s):
//   Animated version of the convergence-map opener — clicks different
//   left-rail patterns at 4-second intervals so the map visibly shifts
//   highlighted clusters throughout. Replaces the static capture-g.
//
// Cost: $0 (read-only).
//
//   npx tsx scripts/capture-g2-convergence-animated.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "https://lacunex.com";
const COHORT_ROUND = "2026-04-24T21-21-52-268Z";

async function main() {
  const setup = captureSetup("g2", "convergence-animated");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  await page.goto(`${BASE}/rounds/${COHORT_ROUND}/aggregate`, {
    waitUntil: "load",
    timeout: 60_000,
  });
  // Page is visibly rendered well before waitForFunction would match.
  // Just wait a fixed window for the force-directed layout to settle.
  await page.waitForTimeout(6_000);

  // Click 6 different pattern cards. Coordinates measured against the
  // live prod page via probe-pattern-buttons.ts: each card is 271x93,
  // at x=24, with y values increasing by 102-103px starting at 398
  // (skip pattern 1 since it's the default-selected one — start clicking
  // from pattern 2 onward).
  const patternYs = [398, 501, 603, 706, 808, 296]; // 6 different patterns, ending back at #1 for symmetry
  const PATTERN_X = 160; // center of the 271-wide card

  await page.waitForTimeout(800);

  for (const y of patternYs) {
    await page.mouse.move(PATTERN_X, y, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.click(PATTERN_X, y);
    await page.waitForTimeout(3_200); // hold so the pattern detail reads
  }

  // Final hover-sweep across the map (~2.5s of subtle motion)
  await page.mouse.move(700, 400, { steps: 14 });
  await page.waitForTimeout(700);
  await page.mouse.move(1100, 480, { steps: 14 });
  await page.waitForTimeout(1_500);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-g2 failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
