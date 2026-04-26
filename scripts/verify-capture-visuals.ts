// Verifies that the capture-helpers fixes produce the expected visuals:
// 1. Fake cursor is visible on screen at a known coordinate
// 2. nextjs-portal is hidden (no "1 issue" badge)
// 3. No page errors on the aggregate page
// Outputs a PNG at transcripts/captures/_verify/aggregate-with-cursor.png

import { chromium } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";
import { injectFakeCursor } from "./lib/capture-helpers";

const BASE = "http://localhost:3000";
const ROUND = "2026-04-24T21-21-52-268Z";
const OUT_DIR = path.join(process.cwd(), "transcripts", "captures", "_verify");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await injectFakeCursor(context);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${BASE}/rounds/${ROUND}/aggregate`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /11 sessions/i.test(document.body.innerText), null, { timeout: 15_000 });
  await page.waitForSelector("svg", { timeout: 15_000 });
  await page.waitForTimeout(1_500);

  // Move the cursor to a visible mid-screen spot so we can see it in the screenshot
  await page.mouse.move(960, 540, { steps: 12 });
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(OUT_DIR, "aggregate-with-cursor.png"), fullPage: false });

  // Quick assertions
  const checks = await page.evaluate(() => {
    const cursor = document.getElementById("__pw_fake_cursor");
    const cursorBox = cursor ? cursor.getBoundingClientRect() : null;
    const portal = document.querySelector("nextjs-portal");
    const portalVisible = portal
      ? (() => { const cs = getComputedStyle(portal as Element); return cs.display !== "none" && cs.visibility !== "hidden"; })()
      : null;
    return {
      cursorPresent: Boolean(cursor),
      cursorVisible: cursorBox ? cursorBox.width > 0 && cursorBox.height > 0 : false,
      cursorAt: cursorBox ? { x: cursorBox.left, y: cursorBox.top } : null,
      portalPresent: Boolean(portal),
      portalVisible,
    };
  });

  console.log(JSON.stringify({ pageErrors: errors, ...checks }, null, 2));

  await context.close();
  await browser.close();
}

main().catch((err) => {
  process.stderr.write(`verify failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
