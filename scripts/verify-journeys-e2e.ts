/**
 * Verifies every claimed user journey is walkable end-to-end through the UI
 * by a fresh visitor — NO direct API calls, NO sessionStorage hand-poking,
 * NO pre-seeded data assumed beyond the bundled briefs.
 *
 * Run with the dev server up:
 *   npm run dev   (in another terminal)
 *   npx tsx scripts/verify-journeys-e2e.ts
 *
 * Each journey logs PASS / FAIL / SKIP plus a one-line note. A summary
 * table prints at the end. Exit code is non-zero if any journey fails.
 *
 * Conversation turns are kept short (1–2 participant turns) — the goal is
 * UI-walkability, not LLM quality. Real Anthropic API calls are made.
 */

import { chromium, type Browser, type Page, type BrowserContext } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HEADLESS = process.env.HEADLESS !== "0";
const SLOWMO = Number(process.env.SLOWMO ?? "0");

interface Result {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  note: string;
  durationMs: number;
}

const results: Result[] = [];

async function run<T>(name: string, fn: (page: Page) => Promise<string>): Promise<void> {
  const t0 = Date.now();
  console.log(`\n──── ${name} ────`);
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  try {
    browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOWMO });
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      // Grant clipboard permissions so copy-to-clipboard handlers don't throw.
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error(`  [pageerror] ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error(`  [console.error] ${msg.text()}`);
    });
    const note = await fn(page);
    const ms = Date.now() - t0;
    results.push({ name, status: "PASS", note, durationMs: ms });
    console.log(`  PASS (${ms}ms) — ${note}`);
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, status: "FAIL", note: msg.slice(0, 200), durationMs: ms });
    console.error(`  FAIL (${ms}ms) — ${msg}`);
    // Capture state from all open pages in the context for postmortem.
    if (context) {
      const slug = name.split(" ")[0].toLowerCase();
      const dir = `tmp/verify-failure-${slug}`;
      await import("node:fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
      const pages = context.pages();
      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        try {
          await p.screenshot({ path: `${dir}/page${i}.png`, fullPage: true });
          const html = await p.content();
          const url = p.url();
          await import("node:fs").then((fs) =>
            fs.writeFileSync(`${dir}/page${i}.txt`, `URL: ${url}\n\n${html.slice(0, 8000)}`)
          );
          console.error(`    [page${i}] ${url}`);
        } catch { /* ignore */ }
      }
    }
  } finally {
    await context?.close();
    await browser?.close();
  }
}

// Wait for the conductor's first opening question to appear in the chat.
// The page calls /api/turn on mount with an empty transcript; first response
// can take 2–6s.
async function waitForConductorOpening(page: Page, timeout = 30000): Promise<string> {
  // Host bubbles render the conductor utterance. We look for any text that
  // belongs to a host turn — the chat pane uses role labels.
  await page.waitForFunction(
    () => {
      // The ChatPane shows host turns. Look for a non-trivial string in the
      // main chat area beyond the header.
      const main = document.querySelector("main") || document.body;
      const text = main.textContent || "";
      // Heuristic: > 60 chars of non-header text means the LLM responded.
      return text.length > 200;
    },
    undefined,
    { timeout }
  );
  return "conductor opened";
}

// Toggle open the "/host" quick-generator collapsible. The button text is
// hydrated by React after first paint; click landing too early just bounces
// off the un-mounted handler. Scroll into view + retry until the textarea
// shows up.
async function openQuickGenerator(page: Page, attempts = 3): Promise<void> {
  const btn = page.locator("button", { hasText: /skip the conversation/i }).first();
  await btn.waitFor({ state: "visible", timeout: 10000 });
  for (let i = 0; i < attempts; i++) {
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click().catch(() => {});
    const ta = page.locator("textarea").first();
    try {
      await ta.waitFor({ state: "visible", timeout: 3500 });
      return;
    } catch { /* try again */ }
  }
  throw new Error("openQuickGenerator: textarea never became visible after toggling");
}

// Send a participant turn and wait for the host reply.
async function sendParticipantTurn(page: Page, text: string, timeoutMs = 60000): Promise<void> {
  // Find the textarea + send button. ChatPane is the canonical input.
  const textarea = page.locator("textarea").first();
  await textarea.waitFor({ state: "visible", timeout: 10000 });
  await textarea.fill(text);

  // Capture current bubble count to detect a new host turn.
  const beforeText = await page.locator("body").innerText();
  const beforeLen = beforeText.length;

  // Try Enter (most chats submit on Enter without modifier).
  await textarea.press("Enter");

  // Wait for new content to appear (host reply lands).
  await page.waitForFunction(
    (prevLen: number) => (document.body.innerText.length ?? 0) > prevLen + 80,
    beforeLen,
    { timeout: timeoutMs }
  );
}

// ─────────────────────────────────────────────────────────────────────
// Journey A — Participant via host-issued invite
// ─────────────────────────────────────────────────────────────────────
async function journeyA(page: Page): Promise<string> {
  // 1. Host: open /host, click "invite link" on the civic brief.
  await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded" });
  // Wait for the briefs grid to hydrate.
  await page.locator("text=Civic Consultation").first().waitFor({ timeout: 10000 });
  // Each brief card renders an "invite link" button. Match the card with
  // :has() so we never click the wrong card's button.
  const civicCard = page.locator("div:has(> div > div:text-is('Civic Consultation'))").first();
  // Fall back to a more permissive selector if the strict one misses.
  let inviteBtn = civicCard.locator("button", { hasText: /invite link/i }).first();
  if ((await inviteBtn.count()) === 0) {
    // The 3rd "invite link" button corresponds to the 3rd brief (civic).
    inviteBtn = page.locator("button", { hasText: /invite link/i }).nth(2);
  }
  await inviteBtn.waitFor({ state: "visible", timeout: 10000 });
  await inviteBtn.click();

  // Wait for the URL block to appear (the code element holds /i/{token}).
  const inviteCode = page.locator(`code:has-text("/i/")`).first();
  await inviteCode.waitFor({ timeout: 15000 });
  const inviteUrl = (await inviteCode.innerText()).trim();
  if (!/\/i\/[1-9A-HJ-NP-Za-km-z]{16}$/.test(inviteUrl)) {
    throw new Error(`invite url malformed: ${inviteUrl}`);
  }

  // 2. Participant: open invite URL in a fresh page (no shared sessionStorage).
  const participantPage = await page.context().newPage();
  await participantPage.goto(inviteUrl, { waitUntil: "domcontentloaded" });

  // /i/[token] is a server component that redirects to /p/{templateId}?invite=...
  await participantPage.waitForURL(/\/p\/.+\?invite=/, { timeout: 15000 });

  // 3. Wait for conductor opening.
  await waitForConductorOpening(participantPage);

  // 4. Send 2 participant turns.
  await sendParticipantTurn(
    participantPage,
    "I'm a resident on the south side. The proposed congestion charge would affect my weekday school run."
  );
  await sendParticipantTurn(
    participantPage,
    "I'd probably switch to driving in earlier or take the bus more on Tuesdays — it's mostly small adjustments."
  );

  // 5. Click "End & Reflect" / End-session button.
  const endBtn = participantPage.locator("button", { hasText: /end.*reflect|end session|end & reflect/i }).first();
  await endBtn.waitFor({ timeout: 10000 });
  await endBtn.click();

  // 6. Wait for "See your reflection →" button (takeaway ready).
  const seeReflection = participantPage.locator("button", { hasText: /see your reflection/i });
  await seeReflection.waitFor({ timeout: 90000 });
  await seeReflection.click();

  // 7. Confirm the takeaway/letter content rendered.
  await participantPage.waitForFunction(
    () => /what surfaced|reflection|sharpened|already have/i.test(document.body.innerText),
    undefined,
    { timeout: 15000 }
  );

  return "invite created → /i redirect → 2-turn chat → takeaway letter rendered";
}

// ─────────────────────────────────────────────────────────────────────
// Journey B — Host creates round, runs session, generates aggregate
// ─────────────────────────────────────────────────────────────────────
async function journeyB(page: Page): Promise<string> {
  // 1. Host: open /rounds, create a round.
  await page.goto(`${BASE}/rounds`, { waitUntil: "domcontentloaded" });

  // The /rounds page renders the create form collapsed once any rounds exist;
  // a "New round" button toggles it. On a totally empty install the form is
  // visible from the start. Always click the toggle if present, then wait
  // explicitly for the label input to attach + become visible.
  const newRoundBtn = page.locator("button:has-text('New round')").first();
  if ((await newRoundBtn.count()) > 0) {
    await newRoundBtn.click();
    // Give React a frame to render the form.
    await page.waitForTimeout(300);
  }

  // Fill label (form may already be visible).
  const labelInput = page.locator('input[type="text"]').first();
  await labelInput.waitFor({ state: "visible", timeout: 15000 });
  const roundLabel = `verify-${Date.now()}`;
  await labelInput.fill(roundLabel);

  // Submit.
  const submitBtn = page.locator("button", { hasText: /create round|start round|create/i }).first();
  await submitBtn.click();

  // Wait for round-created confirmation: a participant link is shown after creation.
  // The page sets `createdRound` and renders a copyable link.
  const createdLink = page.locator(`code:has-text("/p/"), a:has-text("/p/")`).first();
  await createdLink.waitFor({ timeout: 15000 });
  const participantLink = (await createdLink.innerText()).trim();
  if (!/\/p\/.+round=/.test(participantLink)) {
    throw new Error(`participant link missing roundId: ${participantLink}`);
  }

  // Extract roundId for later check.
  const roundId = new URL(participantLink, BASE).searchParams.get("round");
  if (!roundId) throw new Error("round id not parsable from link");

  // 2. Open participant link in a new tab, run a short session, end it.
  const pPage = await page.context().newPage();
  await pPage.goto(participantLink, { waitUntil: "domcontentloaded" });
  await waitForConductorOpening(pPage);
  await sendParticipantTurn(pPage, "I think the strongest argument for the charge is air quality near schools.");
  await sendParticipantTurn(pPage, "But I'm uneasy about families who already drive odd hours for shift work — it doesn't fall on us evenly.");

  const endBtn = pPage.locator("button", { hasText: /end.*reflect|end session|end & reflect/i }).first();
  await endBtn.click();
  await pPage.locator("button", { hasText: /see your reflection/i }).waitFor({ timeout: 90000 });

  // 3. Back on /rounds/[id]: confirm session attached.
  await page.goto(`${BASE}/rounds/${roundId}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => /1 session|session/i.test(document.body.innerText),
    undefined,
    { timeout: 15000 }
  );

  // 4. Click "Generate final aggregate".
  const aggBtn = page.locator("button", { hasText: /generate final aggregate|aggregate/i }).first();
  await aggBtn.waitFor({ timeout: 10000 });
  await aggBtn.click();

  // 5. Wait for aggregate ready (button changes to "Regenerate" or aggregate panel appears).
  await page.waitForFunction(
    () => /regenerate|aggregate ready|top theme|pattern/i.test(document.body.innerText),
    undefined,
    { timeout: 90000 }
  );

  // 6. Open the convergence map (aggregate detail page).
  const openAggLink = page.locator("a", { hasText: /open aggregate|aggregate/i }).first();
  await openAggLink.click();
  await page.waitForURL(/\/rounds\/.+\/aggregate/, { timeout: 10000 });
  // Confirm the convergence map renders something (ConvergenceMap component or an SVG node).
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return /pattern|theme|convergen|cohort/i.test(text);
    },
    undefined,
    { timeout: 15000 }
  );

  return `round ${roundId.slice(0, 24)} → 1 session → aggregate generated → convergence page opened`;
}

// ─────────────────────────────────────────────────────────────────────
// Journey C — /demo standalone (no setup)
// ─────────────────────────────────────────────────────────────────────
async function journeyC(page: Page): Promise<string> {
  await page.goto(`${BASE}/demo`, { waitUntil: "domcontentloaded" });
  await waitForConductorOpening(page);
  await sendParticipantTurn(page, "I'm exploring whether to change the way we run weekly retros.");
  // Confirm dashboard pane has populated (extraction visible).
  await page.waitForFunction(
    () => /extraction|objectives|insight|dashboard/i.test(document.body.innerText),
    undefined,
    { timeout: 15000 }
  );
  return "demo opens, conductor speaks, extraction surface visible";
}

// ─────────────────────────────────────────────────────────────────────
// Journey D — Brief Designer recursive (/p/brief-designer)
// ─────────────────────────────────────────────────────────────────────
async function journeyD(page: Page): Promise<string> {
  // 1. Host: click "design your brief" card.
  await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded" });
  const designerLink = page.locator("a", { hasText: /design your brief|brief designer|author your own brief|design your own/i }).first();
  await designerLink.click();
  await page.waitForURL(/\/p\/brief-designer/, { timeout: 10000 });
  await waitForConductorOpening(page);

  // 2. Send 4 participant turns to give the designer enough material.
  await sendParticipantTurn(page, "I want to interview small-business owners about their cash-flow worries.");
  await sendParticipantTurn(page, "Specifically: how they decide which bills to pay first when revenue is tight.");
  await sendParticipantTurn(page, "I want to learn what mental models they use, and what triggers panic vs calm.");
  await sendParticipantTurn(page, "Done — let's wrap and generate the brief.");

  // 3. Click End & Reflect (or designer auto-wraps).
  const endBtn = page.locator("button", { hasText: /end.*reflect|end session|end & reflect/i }).first();
  if (await endBtn.count()) await endBtn.click().catch(() => {});

  // 4. Wait for the brief artifact card to surface ("See your brief →" or auto-open).
  // Brief-designer auto-opens the artifact after generation.
  await page.waitForFunction(
    () => /try as participant|run this brief|brief generated|see your brief/i.test(document.body.innerText),
    undefined,
    { timeout: 120000 }
  );

  // 5. Click "Try as participant" / "Run this brief".
  const tryBtn = page.locator("button, a", { hasText: /try as participant|run this brief/i }).first();
  await tryBtn.waitFor({ timeout: 10000 });
  await tryBtn.click();

  // 6. We should land on /p/gen-... and the conductor should open.
  await page.waitForURL(/\/p\/gen-/, { timeout: 10000 });
  await waitForConductorOpening(page);

  return "brief-designer chat → brief artifact → run-this-brief → participant chat opens with new brief";
}

// ─────────────────────────────────────────────────────────────────────
// Journey E — One-shot brief generator (/host quick generator)
// ─────────────────────────────────────────────────────────────────────
async function journeyE(page: Page): Promise<string> {
  await page.goto(`${BASE}/host`, { waitUntil: "networkidle" });
  await openQuickGenerator(page);
  const textarea = page.locator("textarea").first();
  await textarea.waitFor({ state: "visible", timeout: 10000 });
  await textarea.fill(
    "I want to interview senior software engineers about whether they trust LLM code-review. Host = engineering manager; participant = senior engineer. I'm trying to learn how trust is calibrated turn-by-turn."
  );
  const generateBtn = page.locator("button", { hasText: /^generate brief$/i }).first();
  await generateBtn.click();

  // Wait for "brief generated" + name + try-as-participant button.
  await page.waitForFunction(
    () => /try as participant|brief generated/i.test(document.body.innerText),
    undefined,
    { timeout: 90000 }
  );
  const tryBtn = page.locator("button", { hasText: /try as participant/i }).first();
  await tryBtn.click();
  await page.waitForURL(/\/p\/gen-/, { timeout: 10000 });
  await waitForConductorOpening(page);
  return "one-shot generator → /p/gen-... → conductor opens";
}

// ─────────────────────────────────────────────────────────────────────
// Cross-tab persistence check (the audit's flagged risk)
// ─────────────────────────────────────────────────────────────────────
async function crossTabCheck(page: Page): Promise<string> {
  // Generate a brief in tab 1.
  await page.goto(`${BASE}/host`, { waitUntil: "networkidle" });
  await openQuickGenerator(page);
  await page.locator("textarea").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator("textarea").first().fill(
    "Cross-tab check: very brief brief about hobby gardening preferences."
  );
  await page.locator("button", { hasText: /^generate brief$/i }).first().click();
  await page.waitForFunction(
    () => /try as participant/i.test(document.body.innerText),
    undefined,
    { timeout: 90000 }
  );

  // Capture the generated brief's eventual URL by clicking try-as-participant
  // and noting where we end up.
  await page.locator("button", { hasText: /try as participant/i }).first().click();
  await page.waitForURL(/\/p\/gen-/, { timeout: 10000 });
  const generatedUrl = page.url();

  // Open the same URL in a *fresh context* (no sessionStorage shared).
  const browser = page.context().browser();
  if (!browser) throw new Error("no browser handle");
  const freshCtx = await browser.newContext();
  const freshPage = await freshCtx.newPage();
  await freshPage.goto(generatedUrl, { waitUntil: "domcontentloaded" });
  // Wait briefly, then check whether "Unknown brief" appears.
  await freshPage.waitForTimeout(2500);
  const text = await freshPage.locator("body").innerText();
  await freshCtx.close();

  if (/unknown brief/i.test(text)) {
    throw new Error(`CROSS-TAB BROKEN: fresh visit to ${generatedUrl} shows "Unknown brief". Generated brief is sessionStorage-only — cannot be shared with another tab/device/participant.`);
  }
  return "fresh-context visit to /p/gen-* loaded the brief (server-persisted)";
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Lacunex journey verification — base ${BASE}, headless=${HEADLESS}`);

  // Quick smoke: server up?
  try {
    const r = await fetch(BASE);
    console.log(`  Server responded ${r.status}`);
  } catch (err) {
    console.error(`Cannot reach ${BASE}. Is the dev server up?`);
    process.exit(2);
  }

  const only = process.env.ONLY?.split(",").map((s) => s.trim().toUpperCase());
  const should = (k: string) => !only || only.includes(k);
  if (should("A")) await run("A · Participant via invite (full chat → takeaway)", journeyA);
  if (should("B")) await run("B · Host round + aggregate (1-session aggregate)", journeyB);
  if (should("C")) await run("C · /demo standalone", journeyC);
  if (should("D")) await run("D · Brief Designer recursive", journeyD);
  if (should("E")) await run("E · One-shot brief generator", journeyE);
  if (should("X")) await run("X · Cross-tab persistence of generated brief", crossTabCheck);

  // Summary
  console.log("\n──────────────────────── SUMMARY ────────────────────────");
  for (const r of results) {
    const tag = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "·";
    console.log(`${tag} ${r.status.padEnd(4)} ${r.name.padEnd(60)} ${(r.durationMs / 1000).toFixed(1)}s`);
    if (r.status !== "PASS") console.log(`     └─ ${r.note}`);
  }
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n${failed} failed of ${results.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
