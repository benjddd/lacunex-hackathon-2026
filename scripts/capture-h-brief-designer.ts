// Capture H (DEMO_SCRIPT.md 2:14–2:24, 10s):
//   Cut back to /host. Cursor flashes through the template grid — Civic
//   Consultation highlights briefly, then the cursor lands on the "Brief
//   Designer" card. Hold for 1s.
//
// Cost: $0 (read-only).
//
//   npx tsx scripts/capture-h-brief-designer.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers.ts";

const BASE = "http://localhost:3000";

async function main() {
  const setup = captureSetup("h", "brief-designer-reveal");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Brief Designer", { timeout: 10_000 });
  await page.waitForTimeout(1_500);

  // Sweep across the bundled briefs first
  await page.mouse.move(450, 400, { steps: 14 });
  await page.waitForTimeout(450);

  // Hover Founder Investment Evaluation
  const founder = page.locator('text="Founder Investment Evaluation"').first();
  if (await founder.isVisible().catch(() => false)) {
    await founder.hover();
    await page.waitForTimeout(700);
  }
  // Hover Post-Incident Witness Interview
  const postIncident = page.locator('text="Post-Incident Witness Interview"').first();
  if (await postIncident.isVisible().catch(() => false)) {
    await postIncident.hover();
    await page.waitForTimeout(700);
  }
  // Hover Civic Consultation (briefly highlight per DEMO_SCRIPT)
  const civic = page.locator('text="Civic Consultation"').first();
  if (await civic.isVisible().catch(() => false)) {
    await civic.hover();
    await page.waitForTimeout(900);
  }

  // Land on the Brief Designer card and hold
  const briefDesigner = page.locator('text="Brief Designer"').first();
  await briefDesigner.scrollIntoViewIfNeeded();
  await briefDesigner.hover();
  await page.waitForTimeout(2_400); // hold per DEMO_SCRIPT (1s + tail for editor)

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-h failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
