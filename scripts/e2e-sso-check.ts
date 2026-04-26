// E2E: verify lacunex.com has no SSO / deployment-protection wall.
// Free — no API calls. Runs against prod.
//
//   npx tsx scripts/e2e-sso-check.ts

import { chromium, type Browser } from "playwright";

const BASE = "https://lacunex.com";

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    // Simulate a judge: no cookies, no auth
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));

  try {
    // ---- / ----
    const res = await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const status = res?.status() ?? 0;
    r.notes.push(`GET / → HTTP ${status}`);
    if (status !== 200) {
      r.errors.push(`/ returned ${status} — possible SSO or deploy-protection wall`);
    }

    // Vercel SSO wall shows a form with id="sso-form" or text "Vercel Authentication"
    const ssoForm =
      (await page.locator("#sso-form").count()) +
      (await page.getByText(/Vercel Authentication|Sign in to/i).count());
    if (ssoForm > 0) {
      await page.screenshot({ path: "transcripts/e2e-sso-wall.png" });
      r.errors.push("SSO / deployment-protection wall detected (screenshot saved)");
    } else {
      r.notes.push("no SSO wall on /");
    }

    // Confirm the real landing page rendered (3 role cards)
    const running = await page
      .waitForSelector("text=running interviews", { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!running) {
      await page.screenshot({ path: "transcripts/e2e-sso-landing-error.png" });
      r.errors.push("landing page did not render role cards — screenshot saved");
    } else {
      r.notes.push("landing page rendered (3 role cards visible)");
    }

    // ---- /rounds (seeded cohort should be listed) ----
    const roundsRes = await page.goto(`${BASE}/rounds`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    r.notes.push(`GET /rounds → HTTP ${roundsRes?.status() ?? 0}`);
    const cohortVisible = await page
      .waitForSelector("text=Congestion charge cohort", { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!cohortVisible) {
      r.errors.push("/rounds does not show seeded cohort — KV empty or page broken");
    } else {
      r.notes.push("/rounds shows seeded cohort");
    }

    // ---- /rounds/<id>/aggregate ----
    const aggRes = await page.goto(
      `${BASE}/rounds/2026-04-24T21-21-52-268Z/aggregate`,
      { waitUntil: "domcontentloaded", timeout: 20_000 }
    );
    r.notes.push(`GET /rounds/.../aggregate → HTTP ${aggRes?.status() ?? 0}`);
    const svgCount = await page.locator("svg").count();
    if (svgCount < 1) {
      r.errors.push("aggregate page missing SVG (convergence map not rendered)");
    } else {
      r.notes.push(`aggregate page rendered (${svgCount} svg element(s))`);
    }

    await page.screenshot({ path: "transcripts/e2e-sso-check-final.png", fullPage: false });
    r.notes.push("saved screenshot to transcripts/e2e-sso-check-final.png");

    r.ok = r.errors.length === 0;
  } catch (err) {
    r.errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
  return r;
}

run().then((r) => {
  process.stdout.write("=== E2E SSO / prod check ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
