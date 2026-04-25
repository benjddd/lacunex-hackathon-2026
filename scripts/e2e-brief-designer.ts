// End-to-end smoke test for the brief-designer flow via Playwright.
//
// Drives /p/brief-designer in real chromium with canned host-designer
// responses, watches for the wrap_up auto-trigger, and asserts that the
// brief artifact (BriefAuthored) materialises without manual clicks and
// without the reflection-peek leakage we saw in screenshots earlier.
//
// Costs real Anthropic API tokens (~$1-2 per run). Run sparingly.
//
// Usage (dev server must be running on http://localhost:3000):
//   npx tsx scripts/e2e-brief-designer.ts

import { chromium, type Browser, type Page } from "playwright";

const BASE = "http://localhost:3000";
const URL = `${BASE}/p/brief-designer`;

// Test mode:
//   --mode=manual   (default) clicks End & reflect after 5 turns — validates
//                   the explicit-end path that the demo uses.
//   --mode=natural  sends a 6th "I think that's everything" response and
//                   waits for the conductor's natural wrap_up — validates
//                   the auto-trigger useEffect on move_type=wrap_up.
const TEST_MODE = process.argv.includes("--mode=natural") ? "natural" : "manual";

// Founder persona canned responses (5 turns — enough to satisfy 4 high-prio
// objectives + the "anything else?" check-in).
const RESPONSES = [
  // Turn 1: use case + decision
  "I'm running interviews with churned SaaS customers. The cancel-survey says it's price, but I don't believe it — I think onboarding is broken. The decision is whether next sprint goes to onboarding redesign or pricing experiments.",
  // Turn 2: target participants
  "5 to 8 customers who churned in the last 90 days, ideally ones who used the product more than twice — not the one-and-done crowd, the people who actually tried it.",
  // Turn 3: hypothesis
  "My hypothesis is that the cancel-survey is a polite proxy for 'I never got to value'. Engaged users default to 'too expensive' because it's the socially safe answer.",
  // Turn 4: assumptions / blind spots
  "I'm assuming the activation moment is real and we just don't measure it well. I might be wrong that pricing isn't the issue — that's part of why I'm running this.",
  // Turn 5: success shape
  "What I want is convergent patterns across 5 conversations that point at one specific friction. Not a report — just enough signal to commit the next sprint.",
];

async function waitForHostTurn(page: Page, minBubbles: number, timeout = 60_000) {
  await page.waitForFunction(
    (n) =>
      document.querySelectorAll('[data-role="host"]').length >= n ||
      // Fallback: count amber-bg bubbles which is how host turns render today.
      document.querySelectorAll('.bg-amber-50').length >= n,
    minBubbles,
    { timeout }
  );
}

async function sendParticipantTurn(page: Page, text: string) {
  // The participant input is a textarea inside ChatPane; send button is the
  // submit. Locate by placeholder/role.
  const input = page.locator('textarea').first();
  await input.fill(text);
  // Try Enter; ChatPane usually submits on Enter (Shift+Enter for newline).
  await input.press("Enter");
}

interface Result {
  ok: boolean;
  errors: string[];
  notes: string[];
}

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };

  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  // Surface console errors.
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") r.errors.push(`console.error: ${msg.text()}`);
  });

  try {
    r.notes.push(`opening ${URL}`);
    await page.goto(URL, { waitUntil: "domcontentloaded" });

    // Header confirms we're on brief-designer.
    await page.waitForSelector('text=Brief Designer', { timeout: 10_000 });
    r.notes.push("header visible: Brief Designer");

    // Wait for the conductor's opening utterance (turn 0).
    await waitForHostTurn(page, 1, 45_000);
    r.notes.push("conductor turn 0 rendered");

    // Drive responses.
    for (let i = 0; i < RESPONSES.length; i++) {
      // Wait for the input to be enabled (not loading).
      await page.waitForFunction(
        () => {
          const ta = document.querySelector('textarea') as HTMLTextAreaElement | null;
          return ta && !ta.disabled;
        },
        null,
        { timeout: 90_000 }
      );
      await sendParticipantTurn(page, RESPONSES[i]);
      r.notes.push(`sent participant turn ${i + 1}`);
      // Wait for the next host turn to appear (i+2: turn 0 + i+1 host turns).
      await waitForHostTurn(page, i + 2, 90_000);
      r.notes.push(`conductor turn ${i + 1} rendered`);

      // Asserting "no peek button on brief-designer": this should never appear.
      const peekVisible = await page
        .locator('text=Peek at reflection')
        .isVisible()
        .catch(() => false);
      if (peekVisible) {
        r.errors.push(`turn ${i + 1}: Peek-at-reflection button is visible (should be hidden for brief-designer)`);
      }
    }

    if (TEST_MODE === "manual") {
      // Click "End & reflect" to force wrap_up — demo-realistic explicit path.
      const endButton = page.locator('button:has-text("End & reflect")');
      await endButton.waitFor({ state: "visible", timeout: 5_000 });
      await endButton.click();
      r.notes.push("clicked End & reflect (manual mode)");
    } else {
      // Natural mode: send a closing-flavour reply, then wait for the
      // conductor's wrap_up to fire on its own. Validates the auto-trigger.
      await page.waitForFunction(
        () => {
          const ta = document.querySelector('textarea') as HTMLTextAreaElement | null;
          return ta && !ta.disabled;
        },
        null,
        { timeout: 90_000 }
      );
      await sendParticipantTurn(
        page,
        "I think that's everything from my side. Nothing else I'm holding back."
      );
      r.notes.push("sent closing-flavour reply (natural mode); waiting for wrap_up");
    }

    // Header should flip to "Authoring your brief…" (brief-designer copy).
    await page.waitForFunction(
      () => document.body.innerText.includes("Authoring your brief"),
      null,
      { timeout: 30_000 }
    );
    r.notes.push("'Authoring your brief…' status visible");

    // Watch for the BriefAuthored artifact (auto-opens for brief-designer).
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return text.includes("the platform built this from your conversation") ||
               text.includes("run this brief");
      },
      null,
      { timeout: 180_000 }
    );
    r.notes.push("brief artifact materialised");

    // Final assertion: no empty "YOUR REFLECTION" modal lingering.
    const reflectionModalEmpty = await page
      .locator('text=YOUR REFLECTION')
      .isVisible()
      .catch(() => false);
    if (reflectionModalEmpty) {
      r.errors.push("YOUR REFLECTION modal still visible after brief generation");
    }

    // "run this brief" CTA exists.
    const cta = await page.locator('text=run this brief').isVisible().catch(() => false);
    if (!cta) r.errors.push("'run this brief' CTA missing");

    r.ok = r.errors.length === 0;
  } catch (err) {
    r.errors.push(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // Save a screenshot of the final state for inspection.
    try {
      await page.screenshot({ path: "transcripts/e2e-brief-designer-final.png", fullPage: true });
      r.notes.push("saved screenshot to transcripts/e2e-brief-designer-final.png");
    } catch {
      // ignore
    }
    await browser.close();
  }

  return r;
}

run().then((r) => {
  process.stdout.write("=== E2E brief-designer ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
