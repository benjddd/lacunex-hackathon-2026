// Capture A — source material screenshots for the demo cold open.
// Screenshots the Cloudflare Nov 2025 postmortem and the Grenfell Phase 2
// report page, cropped to show the key quote. Free — no API calls.
//
//   npx tsx scripts/e2e-capture-a.ts

import { chromium, type Browser } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

const OUT_DIR = path.join(process.cwd(), "transcripts");

interface CaptureSpec {
  name: string;
  url: string;
  quoteText: string;   // text to scroll into view / highlight
  outFile: string;
}

const CAPTURES: CaptureSpec[] = [
  {
    name: "Cloudflare Nov 2025 postmortem",
    url: "https://blog.cloudflare.com/18-november-2025-outage/",
    quoteText: "unchallenged assumptions",
    outFile: "capture-a-cloudflare.png",
  },
  {
    // Official site is behind a CAPTCHA. Wikipedia article on the inquiry
    // is recognisable, stable, and has the Phase 2 quote in its body.
    name: "Grenfell Tower Inquiry (Wikipedia)",
    url: "https://en.wikipedia.org/wiki/Grenfell_Tower_Inquiry",
    quoteText: "decades of failure",
    outFile: "capture-a-grenfell.png",
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

      // Wait for body to populate
      await page.waitForFunction(
        () => document.body.innerText.length > 200,
        null,
        { timeout: 15_000 }
      ).catch(() => {});

      // Try to scroll the key quote into view
      const scrolled = await page.evaluate((quote: string) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (node.textContent?.toLowerCase().includes(quote.toLowerCase())) {
            const el = node.parentElement;
            if (el) {
              el.scrollIntoView({ block: "center" });
              // Add a subtle yellow highlight so the frame is readable
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
        await page.waitForTimeout(500); // let scroll settle
      } else {
        r.notes.push(`  quote not found on page — taking full-page screenshot anyway`);
      }

      const outPath = path.join(OUT_DIR, spec.outFile);
      await page.screenshot({ path: outPath, fullPage: false });
      r.notes.push(`  saved: ${spec.outFile}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      r.errors.push(`${spec.name}: ${msg}`);
      // Save a blank screenshot as placeholder so the file exists
      const outPath = path.join(OUT_DIR, spec.outFile);
      await page.screenshot({ path: outPath, fullPage: false }).catch(() => {});
    } finally {
      await ctx.close();
    }
  }

  await browser.close();
  r.ok = r.errors.length === 0;
  return r;
}

run().then((r) => {
  process.stdout.write("=== Capture A screenshots ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
