// Capture B (DEMO_SCRIPT.md 0:20–0:33, 13s):
//   /host page. Cursor moves across template grid; hovers over the "Civic
//   Consultation" card; cursor flashes briefly on the "invite link" button
//   (capture this 1s flash for narrative truth, then cut). Then click "demo ·
//   both sides" → /demo?brief=civic-consultation. Conductor turn 0 lands.
//
// Cost: $0 (no conductor call beyond the natural turn 0 that happens on /demo
// load).
//
//   npx tsx scripts/capture-b-template-pick.ts

import { chromium } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
} from "./lib/capture-helpers";

const BASE = "http://localhost:3000";

async function main() {
  const setup = captureSetup("b", "template-pick");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  // Tuned for ~13s total runtime (DEMO_SCRIPT 0:20–0:33 = 13s).
  await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Civic Consultation", { timeout: 10_000 });
  await page.waitForTimeout(500); // brief beat for page to settle (~0.5s)

  // Single cursor sweep landing on Civic Consultation card (~1.5s)
  await page.mouse.move(600, 360, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.move(1350, 360, { steps: 14 });
  await page.waitForTimeout(400);

  // Hover Civic Consultation card heading (~0.8s)
  const civicCard = page.locator('text="Civic Consultation"').first();
  await civicCard.hover();
  await page.waitForTimeout(600);

  // 1s flash on the "invite link" button — narrative truth (production path
  // generates an /i/<token> URL); do NOT click.
  const inviteBtn = page.locator('button:has-text("invite link")').first();
  await inviteBtn.hover();
  await page.waitForTimeout(900);

  // Click "demo · both sides" → /demo split-screen
  const demoLink = page.locator('a:has-text("demo · both sides")').nth(2);
  await demoLink.hover();
  await page.waitForTimeout(250);
  await demoLink.click();

  // Wait for /demo to render with the conductor's turn 0 host bubble
  await page.waitForURL(/\/demo/, { timeout: 10_000 });
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1_500); // hold on the rendered turn 0

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-b failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
