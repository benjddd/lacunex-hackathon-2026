// Capture F (DEMO_SCRIPT.md 1:34–1:54, 20s):
//   Letter takeaway. Surface transitions: chat is replaced by a letter-style
//   reflection. Centred 620px column, Instrument Serif headline. Scroll to
//   "What surfaced between the lines" section. Hold.
//
// Two modes:
//   --mode=static (default) — navigate to /sessions/<winning-sim> which has
//     the pre-baked takeaway already rendered at the bottom of the page.
//     Smooth-scroll to the "What surfaced between the lines" heading. $0 cost.
//   --mode=live — drive a fresh /demo session with a closing-flavour final
//     turn so the conductor calls wrap_up. Captures the live chat-to-letter
//     transition. ~$2–3 cost.
//
//   npx tsx scripts/capture-f-takeaway.ts
//   npx tsx scripts/capture-f-takeaway.ts --mode=live

import { chromium, type Page } from "playwright";
import {
  captureSetup,
  finaliseRecording,
  injectFakeCursor,
  smoothScrollToY,
  typeLikeAHuman,
} from "./lib/capture-helpers.ts";

const BASE = "http://localhost:3000";
const WINNING_SESSION = "2026-04-26T04-43-27-086Z";

const mode = process.argv.includes("--mode=live") ? "live" : "static";

async function recordStatic(page: Page) {
  await page.goto(`${BASE}/sessions/${WINNING_SESSION}`, {
    waitUntil: "domcontentloaded",
  });
  // Page renders chat first, then the letter at the bottom — wait for the
  // takeaway heading to be in the DOM.
  await page.waitForFunction(
    () => /what surfaced between the lines/i.test(document.body.innerText),
    null,
    { timeout: 20_000 }
  );
  await page.waitForTimeout(1_500);

  // Smooth-scroll to the headline ("Thank you for the conversation." or the
  // letter intro), pause, then to "What surfaced between the lines"
  const intro = page.locator('text=/Thank you for|Lacunex — your reflection/i').first();
  if (await intro.isVisible().catch(() => false)) {
    await intro.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_000);
  }
  const surfaced = page.getByText(/What surfaced between the lines/i).first();
  const box = await surfaced.boundingBox();
  if (box) {
    const targetY = (await page.evaluate(() => window.scrollY)) + box.y - 200;
    await smoothScrollToY(page, Math.max(0, targetY));
  }
  await page.waitForTimeout(4_500); // long hold on the section heading + body
}

async function recordLive(page: Page) {
  await page.goto(`${BASE}/demo?brief=civic-consultation`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
    null,
    { timeout: 60_000 }
  );

  // Drive 3 turns then a closing-flavour reply that signals wrap_up. This
  // mirrors scripts/e2e-brief-designer.ts --mode=natural for the auto-end
  // path. Texts mirror the new winning sim's final turns.
  const turns = [
    "I think it's broadly the right direction. I take the bus more now than I used to — bit longer, but predictable.",
    "Honestly, I wouldn't have switched if I didn't know the charge was coming. I've made my peace with it preemptively.",
    "I think you've actually got everything that matters. I came in expecting a survey-style chat, and I'm leaving thinking about how I've been quietly rearranging my week without ever flagging it. That's enough.",
  ];
  const TURN_TIMEOUT_MS = 120_000;

  for (const t of turns) {
    const before = await page.locator(".bg-amber-50.rounded-bl-sm").count();
    const input = page.locator("textarea").first();
    await typeLikeAHuman(input, t);
    await page.waitForTimeout(450);
    await input.press("Enter");
    await page.waitForFunction(
      (prev: number) =>
        document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
      before,
      { timeout: TURN_TIMEOUT_MS }
    );
    await page.waitForTimeout(1_500);
  }

  // Click "See your reflection →" — the post-wrap-up CTA
  const reflectBtn = page
    .locator('button:has-text("See your reflection"), a:has-text("See your reflection")')
    .first();
  if (await reflectBtn.isVisible().catch(() => false)) {
    await reflectBtn.hover();
    await page.waitForTimeout(700);
    await reflectBtn.click();
  }

  // Wait for the letter view
  await page.waitForFunction(
    () => /what surfaced between the lines/i.test(document.body.innerText),
    null,
    { timeout: 90_000 }
  );
  await page.waitForTimeout(1_800);

  const surfaced = page.getByText(/What surfaced between the lines/i).first();
  const box = await surfaced.boundingBox();
  if (box) {
    const targetY = (await page.evaluate(() => window.scrollY)) + box.y - 200;
    await smoothScrollToY(page, Math.max(0, targetY));
  }
  await page.waitForTimeout(4_500);
}

async function main() {
  const setup = captureSetup("f", `takeaway-${mode}`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: setup.videoDir, size: { width: 1920, height: 1080 } },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  if (mode === "live") await recordLive(page);
  else await recordStatic(page);

  const out = await finaliseRecording(page, context, setup);
  await browser.close();
  process.stdout.write(`mode=${mode} saved: ${out}\n`);
}

main().catch((err) => {
  process.stderr.write(`capture-f failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
