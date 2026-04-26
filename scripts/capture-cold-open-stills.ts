// Capture A — cold-open quote-card stills.
// DEMO_SCRIPT cold open uses 3 quotes:
//   1. Cloudflare Nov 2025 outage postmortem ("unchallenged assumptions")
//   2. UK Covid-19 Inquiry, Module 1, July 2024 ("'groupthink' undermined the
//      effectiveness of their advice")
//   3. Hackney consultation quashed in High Court, Nov 2024 ("failing to
//      provide consultees with sufficient information to make an intelligent
//      response")
//
// Cloudflare still already exists at transcripts/capture-a-cloudflare.png.
// This script captures the other two via Playwright.
//
//   npx tsx scripts/capture-cold-open-stills.ts

import { chromium, type Browser } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

const OUT_DIR = path.join(process.cwd(), "transcripts");

interface CaptureSpec {
  name: string;
  url: string;
  quoteText: string;
  outFile: string;
}

const CAPTURES: CaptureSpec[] = [
  {
    // Wikipedia article on the UK Covid-19 Inquiry — stable, no CAPTCHA, has
    // Module 1 + the "groupthink" quote in body. Same approach as Grenfell.
    name: "UK Covid-19 Inquiry (Wikipedia)",
    url: "https://en.wikipedia.org/wiki/UK_Covid-19_Inquiry",
    quoteText: "groupthink",
    outFile: "capture-a-covid-inquiry.png",
  },
  {
    // Wikipedia article on Hackney London Borough Council — has the 2024
    // judicial review quashing the consultation. Stable URL.
    name: "Hackney London Borough Council (Wikipedia)",
    url: "https://en.wikipedia.org/wiki/Hackney_London_Borough_Council",
    quoteText: "consultation",
    outFile: "capture-a-hackney.png",
  },
];

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: true });

  for (const spec of CAPTURES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    try {
      r.notes.push(`fetching: ${spec.name}`);
      const res = await page.goto(spec.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      r.notes.push(`  HTTP ${res?.status() ?? "?"}`);

      await page.waitForFunction(
        () => document.body.innerText.length > 200,
        null,
        { timeout: 15_000 }
      ).catch(() => {});

      const scrolled = await page.evaluate((quote: string) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (node.textContent?.toLowerCase().includes(quote.toLowerCase())) {
            const el = node.parentElement;
            if (el) {
              el.scrollIntoView({ block: "center" });
              const prev = el.style.backgroundColor;
              el.style.backgroundColor = "#fef08a";
              setTimeout(() => { el.style.backgroundColor = prev; }, 5000);
              return true;
            }
          }
        }
        return false;
      }, spec.quoteText);

      if (scrolled) {
        r.notes.push(`  scrolled to "${spec.quoteText}"`);
        await page.waitForTimeout(500);
      } else {
        r.notes.push(`  quote not found — taking page-top screenshot`);
      }

      const outPath = path.join(OUT_DIR, spec.outFile);
      await page.screenshot({ path: outPath, fullPage: false });
      r.notes.push(`  saved: ${spec.outFile}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      r.errors.push(`${spec.name}: ${msg}`);
    } finally {
      await ctx.close();
    }
  }

  await browser.close();
  r.ok = r.errors.length === 0;
  return r;
}

run().then((r) => {
  process.stdout.write("=== Cold-open stills ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
