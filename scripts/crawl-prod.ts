/**
 * Crawl production lacunex.com to verify routes render, navigation works,
 * and existing data looks professional. Captures full-page screenshots.
 *
 * Run: npx tsx scripts/crawl-prod.ts
 */
import { chromium, type Page } from "playwright";
import * as fs from "node:fs";

const BASE = "https://lacunex.com";
const OUT = "tmp/prod-crawl";
fs.mkdirSync(OUT, { recursive: true });

async function snap(page: Page, slug: string, url: string) {
  console.log(`  ${url}`);
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
    console.error(`    nav error: ${e.message}`);
    return null;
  });
  // Brief settle for client hydration.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${slug}.png`, fullPage: true });
  const text = (await page.locator("body").innerText()).slice(0, 500).replace(/\s+/g, " ");
  console.log(`    ${res?.status() ?? "?"}  body: ${text.slice(0, 180)}…`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`    [pageerror] ${e.message}`));

  console.log("--- Top-level surfaces ---");
  await snap(page, "00-home", `${BASE}/`);
  await snap(page, "01-host", `${BASE}/host`);
  await snap(page, "02-demo", `${BASE}/demo`);
  await snap(page, "03-rounds", `${BASE}/rounds`);
  await snap(page, "04-sessions", `${BASE}/sessions`);

  console.log("--- Participant entry routes ---");
  await snap(page, "05-p-civic", `${BASE}/p/civic-consultation`);
  await snap(page, "06-p-founder", `${BASE}/p/founder-product-ideation`);
  await snap(page, "07-p-witness", `${BASE}/p/post-incident-witness`);
  await snap(page, "08-p-designer", `${BASE}/p/brief-designer`);

  console.log("--- Existing data: pick first round + check aggregate ---");
  // GET /api/rounds returns all rounds.
  const roundsRes = await page.request.get(`${BASE}/api/rounds`);
  const roundsJson = await roundsRes.json();
  const rounds = roundsJson.rounds ?? [];
  console.log(`  ${rounds.length} rounds in production`);
  if (rounds.length > 0) {
    // Pick the round with the most sessions (likely the demo cohort)
    const target = rounds.reduce((best: { session_ids: string[] }, r: { session_ids: string[] }) =>
      (r.session_ids?.length ?? 0) > (best?.session_ids?.length ?? 0) ? r : best, rounds[0]);
    const id = (target as { round_id: string }).round_id;
    console.log(`  showcase round: ${id} (${target.session_ids?.length ?? 0} sessions)`);
    await snap(page, "09-round-detail", `${BASE}/rounds/${id}`);
    await snap(page, "10-round-aggregate", `${BASE}/rounds/${id}/aggregate`);
    // Pick first session
    if (target.session_ids?.length) {
      const sid = target.session_ids[0];
      await snap(page, "11-session-detail", `${BASE}/sessions/${sid}`);
    }
  }

  console.log("--- OG image routes (the v2 demo cards) ---");
  for (const og of ["s1-question", "s2-personal", "s8-architecture", "s10-close"]) {
    await snap(page, `og-${og}`, `${BASE}/og/${og}`);
  }

  await browser.close();
  console.log(`\nScreenshots in ${OUT}/`);
}

void main();
