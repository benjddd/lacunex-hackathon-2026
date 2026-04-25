// E2E: front-page navigation. Free — no API calls.
//
// Verifies the / page renders 3 role cards and that each card's primary
// affordance routes correctly.
//
//   npx tsx scripts/e2e-front-page.ts

import { chromium, type Browser } from "playwright";

const BASE = "http://localhost:3000";

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") r.errors.push(`console.error: ${m.text()}`); });
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15_000 });
    r.notes.push("opened /");

    // Three cards — host, participant invite, demo. Using HTML &apos; → U+0027.
    await page.waitForSelector("text=running interviews", { timeout: 10_000 });
    await page.waitForSelector("text=I have an invite", { timeout: 5_000 });
    await page.waitForSelector("text=Just looking", { timeout: 5_000 });
    r.notes.push("three role cards visible");

    // Click the host card → /host
    await Promise.all([
      page.waitForURL(/\/host(\?|$)/, { timeout: 10_000 }),
      page.locator("text=running interviews").first().click(),
    ]);
    if (!page.url().includes("/host")) r.errors.push(`host card did not navigate to /host (got ${page.url()})`);
    else r.notes.push("host card → /host ok");
    await page.waitForSelector('text=Brief Designer', { timeout: 10_000 });

    // Back, click "Just looking" → /demo
    await page.goBack();
    await page.waitForSelector('text=Just looking', { timeout: 10_000 });
    await Promise.all([
      page.waitForURL(/\/demo(\?|$)/, { timeout: 10_000 }),
      page.locator('text=Just looking').first().click(),
    ]);
    if (!page.url().includes("/demo")) r.errors.push(`demo card did not navigate to /demo (got ${page.url()})`);
    else r.notes.push("demo card → /demo ok");
    await page.waitForSelector('text=Demo view', { timeout: 10_000 });

    // Participant invite — invalid token should show error
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[placeholder="invite code or link"]', { timeout: 5_000 });
    const tokenInput = page.locator('input[placeholder="invite code or link"]');
    await tokenInput.fill("not-a-real-token");
    // Press Enter to submit — more reliable than locating the (lowercase,
    // text-transformed) button.
    await tokenInput.press("Enter");
    const validationFired = await page
      .waitForFunction(
        () => /doesn.t look like|paste the invite/i.test(document.body.innerText),
        null,
        { timeout: 8_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!validationFired) {
      await page.screenshot({ path: "transcripts/e2e-front-page-error.png" });
      r.errors.push("invalid token did not surface validation copy (screenshot saved)");
    } else {
      r.notes.push("invite-token validation surfaces error");
    }

    r.ok = r.errors.length === 0;
  } catch (err) {
    r.errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
  return r;
}

run().then((r) => {
  process.stdout.write("=== E2E front-page ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
