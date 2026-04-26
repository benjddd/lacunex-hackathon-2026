// Capture A v2 — three news article HEADER screenshots, cropped tight to
// just the source banner + headline + date. Aim: minimal text in the still
// itself so the Descript composition can layer the cards at slight angles
// without competing visual clutter.

import { chromium, type Browser } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

const OUT = path.join(process.cwd(), "transcripts");

interface Spec {
  name: string;
  url: string;
  outFile: string;
  scrollY?: number;
  // Optional CSS to inject before screenshot — used to hide cookie banners,
  // ad blocks, navigation overlays, anything that competes with the headline.
  hideSelectors?: string[];
}

const SPECS: Spec[] = [
  {
    name: "Cloudflare blog post header (18 Nov 2025)",
    url: "https://blog.cloudflare.com/18-november-2025-outage/",
    outFile: "capture-a-cloudflare.png",
    hideSelectors: [],
  },
  {
    // Cleanest landing page for the Module 1 report — GOV.UK fallback
    // (the inquiry's own site 403'd the agent earlier).
    name: "UK Covid-19 Inquiry — Module 1 (GOV.UK)",
    url: "https://www.gov.uk/government/publications/uk-covid-19-inquiry-resilience-and-preparedness-module-1-report",
    outFile: "capture-a-covid-inquiry.png",
    hideSelectors: ["#global-cookie-message", ".cookie-banner"],
  },
  {
    name: "Hackney Citizen — children's centres consultation",
    url: "https://www.hackneycitizen.co.uk/2024/11/06/hackney-council-admits-unlawful-consultation-childrens-centre-closures/",
    outFile: "capture-a-hackney.png",
    hideSelectors: [],
  },
];

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  fs.mkdirSync(OUT, { recursive: true });

  // Drop the old (Wikipedia) versions to avoid confusion downstream
  for (const old of ["capture-a-cloudflare.png", "capture-a-covid-inquiry.png", "capture-a-hackney.png"]) {
    const p = path.join(OUT, old);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      r.notes.push(`removed previous ${old}`);
    }
  }

  const browser: Browser = await chromium.launch({ headless: true });
  for (const s of SPECS) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    try {
      r.notes.push(`fetching: ${s.name}`);
      const res = await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      r.notes.push(`  HTTP ${res?.status() ?? "?"}`);
      await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 12_000 }).catch(() => {});

      // Hide chrome that competes with the headline
      if (s.hideSelectors?.length) {
        await page.evaluate((sels: string[]) => {
          for (const sel of sels) {
            for (const el of Array.from(document.querySelectorAll(sel))) {
              (el as HTMLElement).style.display = "none";
            }
          }
        }, s.hideSelectors);
      }

      // Scroll to the content header so the screenshot captures
      // source-banner + headline + date, not the navigation chrome only.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
      await page.waitForTimeout(400);

      const out = path.join(OUT, s.outFile);
      // Crop to top of page (above the fold) — most articles put their
      // masthead + H1 + byline in the first 600–800px.
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1600, height: 720 } });
      r.notes.push(`  saved: ${s.outFile} (1600x720)`);
    } catch (err) {
      r.errors.push(`${s.name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  r.ok = r.errors.length === 0;
  return r;
}

run().then((r) => {
  process.stdout.write("=== Cold-open headers v2 ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
