// Diagnostic: open the aggregate page in headless, dump console errors,
// page errors, request failures, and report on the Next.js dev-tools UI
// element presence (so we can confirm whether `nextjs-portal` etc. are
// actually being hidden by capture-helpers.ts injection).
//
//   npx tsx scripts/probe-aggregate-errors.ts

import { chromium } from "playwright";
import { injectFakeCursor } from "./lib/capture-helpers";

const BASE = "http://localhost:3000";
const COHORT_ROUND = "2026-04-24T21-21-52-268Z";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  await injectFakeCursor(context);
  const page = await context.newPage();

  const consoleMsgs: { type: string; text: string }[] = [];
  page.on("console", (msg) => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });
  const requestFails: { url: string; failure: string }[] = [];
  page.on("requestfailed", (req) => {
    requestFails.push({ url: req.url(), failure: req.failure()?.errorText ?? "unknown" });
  });
  const responses4xx5xx: { url: string; status: number }[] = [];
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 400) responses4xx5xx.push({ url: res.url(), status: s });
  });

  await page.goto(`${BASE}/rounds/${COHORT_ROUND}/aggregate`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(4_000); // let the map render + late XHRs

  // Probe Next.js dev UI presence (light DOM hosts only — shadow children
  // not enumerated, but if the host is hidden the children are too).
  const devUiAudit = await page.evaluate(() => {
    const sels = [
      "nextjs-portal",
      "[data-nextjs-toast]",
      "[data-next-mark]",
      "[data-next-mark-loading]",
      "[data-nextjs-dev-tools-button]",
      "#__next-build-watcher",
      "#__next-prerender-indicator",
      // Newer Next.js variants we may have missed:
      "[data-issues-collapse]",
      "[data-issues-popover]",
      "[data-nextjs-call-stack-frame]",
      "[data-nextjs-dialog-overlay]",
      "[data-nextjs-error-overlay]",
      "[data-nextjs-toast-wrapper]",
    ];
    const results: { sel: string; count: number; visible: number }[] = [];
    for (const sel of sels) {
      const nodes = document.querySelectorAll(sel);
      let visible = 0;
      nodes.forEach((n) => {
        const cs = getComputedStyle(n as Element);
        if (cs.display !== "none" && cs.visibility !== "hidden") visible += 1;
      });
      results.push({ sel, count: nodes.length, visible });
    }
    return results;
  });

  // Also: is our cursor div actually mounted?
  const cursorMounted = await page.evaluate(() =>
    Boolean(document.getElementById("__pw_fake_cursor"))
  );

  console.log("\n=== console messages ===");
  for (const m of consoleMsgs.slice(-40)) console.log(`[${m.type}] ${m.text}`);
  console.log("\n=== page errors ===");
  for (const e of pageErrors) console.log(e);
  console.log("\n=== request failures ===");
  for (const r of requestFails) console.log(`${r.url} :: ${r.failure}`);
  console.log("\n=== HTTP 4xx/5xx ===");
  for (const r of responses4xx5xx) console.log(`${r.status} ${r.url}`);
  console.log("\n=== Next.js dev UI audit (count / visible) ===");
  for (const r of devUiAudit) console.log(`${r.sel.padEnd(40)} ${r.count} / ${r.visible}`);
  console.log(`\n__pw_fake_cursor mounted: ${cursorMounted}`);

  await context.close();
  await browser.close();
}

main().catch((err) => {
  process.stderr.write(`probe failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
