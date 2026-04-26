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
} from "./lib/capture-helpers.ts";

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

  // Land on /host
  await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=Civic Consultation", { timeout: 10_000 });
  await page.waitForTimeout(1_200); // beat for the page to settle on camera

  // Cursor sweep across the three brief cards, ending on Civic Consultation
  await page.mouse.move(400, 360, { steps: 12 });
  await page.waitForTimeout(350);
  await page.mouse.move(900, 360, { steps: 18 });
  await page.waitForTimeout(350);
  await page.mouse.move(1350, 360, { steps: 18 }); // hover Civic Consultation card region
  await page.waitForTimeout(900);

  // Hover Civic Consultation card heading specifically (forces hover styles)
  const civicCard = page
    .locator('text="Civic Consultation"')
    .first();
  await civicCard.hover();
  await page.waitForTimeout(700);

  // 1-second flash on the "invite link" button — narrative truth that the
  // production path is the invite-token URL. Hover only, do NOT click — we
  // don't want to actually generate an invite mid-capture.
  const inviteBtn = page
    .locator('button:has-text("invite link")')
    .first();
  await inviteBtn.hover();
  await page.waitForTimeout(1_000);

  // Now click "demo · both sides" on the Civic Consultation card to enter
  // the split-screen recording surface.
  const demoLink = page
    .locator('a:has-text("demo · both sides")')
    .nth(2); // founder, post-incident, civic — civic is the 3rd
  await demoLink.hover();
  await page.waitForTimeout(450);
  await demoLink.click();

  // Wait for /demo to render with the conductor's turn 0 host bubble
  await page.waitForURL(/\/demo/, { timeout: 10_000 });
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(2_500); // hold on the rendered turn 0

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-b failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
