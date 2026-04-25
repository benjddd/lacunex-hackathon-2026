// E2E: convergence-map render at /rounds/<id>/aggregate. Free.
//
// Renders the seeded congestion-charge cohort's aggregate page in headless
// chromium, asserts the hero loads (cluster labels, pattern list, status
// chrome), and saves a final-state screenshot.
//
//   npx tsx scripts/e2e-aggregate.ts

import { chromium, type Browser } from "playwright";

const BASE = "http://localhost:3000";
const ROUND = "2026-04-24T21-21-52-268Z";
const URL = `${BASE}/rounds/${ROUND}/aggregate`;

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") r.errors.push(`console.error: ${m.text()}`); });
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 20_000 });
    r.notes.push(`opened ${URL}`);

    // Anchor-web header + breadcrumb visible
    await page.waitForSelector('text=lacunex', { timeout: 10_000 });
    await page.waitForSelector('text=aggregate', { timeout: 5_000 });
    r.notes.push("anchor-web header + breadcrumb visible");

    // Round meta — label + session count.
    await page.waitForFunction(
      () => /11 sessions/i.test(document.body.innerText),
      null,
      { timeout: 15_000 }
    );
    r.notes.push("round meta visible (11 sessions)");

    // Aggregate must already be present in the seeded round — no
    // "generate aggregate" button should be visible.
    const generateVisible = await page
      .locator('button:has-text("generate aggregate")')
      .isVisible()
      .catch(() => false);
    if (generateVisible) {
      r.errors.push("'generate aggregate' button visible — aggregate not seeded?");
    } else {
      r.notes.push("aggregate already populated (no generate-aggregate CTA)");
    }

    // The verify-cohort-claims button now exists.
    const verifyBtn = page.locator('button:has-text("verify cohort claims"), button:has-text("cohort claims")');
    await verifyBtn.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
      r.errors.push("'verify cohort claims' button not visible on aggregate page");
    });
    if (await verifyBtn.first().isVisible()) r.notes.push("'verify cohort claims' button visible");

    // Convergence map SVG present.
    const svgPresent = await page.locator('svg').count();
    if (svgPresent < 1) r.errors.push("no SVG element on aggregate page (convergence map missing)");
    else r.notes.push(`${svgPresent} svg element(s) found`);

    await page.screenshot({ path: "transcripts/e2e-aggregate-final.png", fullPage: false });
    r.notes.push("saved screenshot to transcripts/e2e-aggregate-final.png");

    r.ok = r.errors.length === 0;
  } catch (err) {
    r.errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
  return r;
}

run().then((r) => {
  process.stdout.write("=== E2E aggregate ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
