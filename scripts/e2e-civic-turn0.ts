// E2E: civic-consultation turn-0 subject framing. Costs ~$0.05-0.10 (one
// conductor call + extraction + meta-noticing).
//
// Verifies the new conductor turn-0 rule fires for civic-consultation and
// that the opening utterance names the subject under consultation in plain
// English (per the SUBJECT UNDER CONSULTATION line in domain_context). Also
// asserts the participant chrome is correctly minimal.
//
//   npx tsx scripts/e2e-civic-turn0.ts

import { chromium, type Browser } from "playwright";

const BASE = "http://localhost:3000";
const URL = `${BASE}/p/civic-consultation`;

// Loose match — we don't require exact wording, just recognisable subject
// terms. Either of these signals the conductor surfaced the subject.
const SUBJECT_SIGNALS = [
  "congestion charge",
  "town centre",
  "eight weeks",
  "weekday",
  "committee",
];

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") r.errors.push(`console.error: ${m.text()}`); });
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 15_000 });
    r.notes.push(`opened ${URL}`);

    // Header
    await page.waitForSelector('text=Civic Consultation', { timeout: 10_000 });

    // Wait for conductor turn 0 to render (a host bubble — amber background).
    await page.waitForFunction(
      () => document.querySelectorAll('.bg-amber-50').length >= 1,
      null,
      { timeout: 60_000 }
    );
    r.notes.push("conductor turn 0 rendered");

    // Read the host bubble text.
    const turn0Text = await page.locator('.bg-amber-50').first().innerText();
    const lower = turn0Text.toLowerCase();
    const hits = SUBJECT_SIGNALS.filter((s) => lower.includes(s));
    if (hits.length === 0) {
      r.errors.push(
        `turn 0 has no subject framing. Expected one of [${SUBJECT_SIGNALS.join(" / ")}]. Got: ${turn0Text.slice(0, 220)}…`
      );
    } else {
      r.notes.push(`turn 0 names subject (matched: ${hits.join(", ")})`);
    }

    // Reasonable length — the new rule asks for 2-3 sentences + 1 question.
    const wordCount = turn0Text.split(/\s+/).length;
    if (wordCount < 35) r.errors.push(`turn 0 looks too short (${wordCount} words)`);
    if (wordCount > 200) r.errors.push(`turn 0 unreasonably long (${wordCount} words)`);
    else r.notes.push(`turn 0 word-count ok (${wordCount})`);

    // Ends with a question (the actual first probe).
    if (!/\?\s*$/.test(turn0Text.trim()))
      r.errors.push("turn 0 does not end with a question");
    else r.notes.push("turn 0 ends with a question");

    // No "Peek at reflection" leak (this is civic, not brief-designer, so
    // the button could appear later — but should NOT appear at turn 0).
    const peekVisible = await page
      .locator('text=Peek at reflection')
      .isVisible()
      .catch(() => false);
    if (peekVisible) r.errors.push("'Peek at reflection' visible at turn 0 (should appear only after PREVIEW_MIN_TURNS)");

    await page.screenshot({ path: "transcripts/e2e-civic-turn0.png", fullPage: false });
    r.notes.push("saved screenshot to transcripts/e2e-civic-turn0.png");

    r.ok = r.errors.length === 0;
  } catch (err) {
    r.errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }
  return r;
}

run().then((r) => {
  process.stdout.write("=== E2E civic-turn0 ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
