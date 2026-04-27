import { chromium } from "playwright";

const URL = "https://lacunex.com/rounds/2026-04-24T21-21-52-268Z/aggregate";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(6_000);

  const buttons = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("button"));
    return all.map((b) => ({
      text: (b.textContent || "").trim().slice(0, 100),
      box: (() => {
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    })).filter((b) => b.box.w > 200);
  });

  console.log("Buttons (width >200):");
  for (const b of buttons.slice(0, 25)) {
    console.log(`  [${b.box.x},${b.box.y} ${b.box.w}x${b.box.h}] ${b.text}`);
  }

  await browser.close();
}

main();
