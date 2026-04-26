// Capture G (DEMO_SCRIPT.md 1:54–2:14, 20s):
//   Hero loads at /rounds/<round>/aggregate — force-directed map, smoothed-
//   hull cluster halos fade in, cluster labels appear. Hover-highlight a
//   pattern on the left rail to light up its supporting sessions.
//
// Cost: $0 (read-only).
//
//   npx tsx scripts/capture-g-convergence.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";
const COHORT_ROUND = "2026-04-24T21-21-52-268Z";

async function main() {
  const setup = captureSetup("g", "convergence-map");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  // Tuned for ~20s total (DEMO_SCRIPT 1:54–2:14 = 20s).
  await page.goto(`${BASE}/rounds/${COHORT_ROUND}/aggregate`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => /11 sessions/i.test(document.body.innerText),
    null,
    { timeout: 15_000 }
  );
  await page.waitForSelector("svg", { timeout: 15_000 });
  await page.waitForTimeout(1_500); // settle on the map

  // Brief cursor sweep over the map area (~1.5s)
  await page.mouse.move(1200, 600, { steps: 14 });
  await page.waitForTimeout(800);

  // Hover left-rail pattern entries — the cinematic moment, longer holds
  const candidates = [
    page.locator('[data-pattern-id]'),
    page.locator('button:has-text("convergent_problem")'),
    page.locator('aside button, nav button').filter({ hasNotText: "" }),
    page.locator('section li, aside li').filter({ hasNotText: "" }),
  ];
  for (const loc of candidates) {
    const count = await loc.count().catch(() => 0);
    if (count >= 2) {
      const items = await loc.all();
      await items[0].hover().catch(() => {});
      await page.waitForTimeout(4_500); // hold on the lit-up pattern
      await items[Math.min(1, items.length - 1)].hover().catch(() => {});
      await page.waitForTimeout(4_500); // hold on the second pattern
      break;
    }
  }

  // End on a held shot of the full map (~5s)
  await page.mouse.move(1300, 540, { steps: 14 });
  await page.waitForTimeout(4_500);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-g failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
