// Diagnose what lacunex.com aggregate page renders.

import { chromium } from "playwright";

const URL = "https://lacunex.com/rounds/2026-04-24T21-21-52-268Z/aggregate";

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("response", (r) => { if (r.url().includes("/api/")) console.log(`[api]`, r.status(), r.url()); });

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("title:", title);
    console.log("body:", text);
  } catch (err) {
    console.log("nav error:", err instanceof Error ? err.message : String(err));
  }
  await context.close();
  await browser.close();
}

main();
