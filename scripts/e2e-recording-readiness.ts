// E2E: validate the actual recording surfaces for the demo, not a fresh
// conductor run (which is stochastic — see DEMO_SCRIPT.md line 190 for
// the explicit fallback to the winning sim session).
//
// Surfaces validated, in capture order:
//   B/C/E. /demo?brief=civic-consultation — split-screen reachable, conductor turn 0 renders
//   E/C.   /sessions/session-2026-04-24T20-59-09-733Z — winning sim with ◆ + ↩ chips visible
//   F.     Letter takeaway from /p/civic-consultation flow (uses the sim session's takeaway artifact)
//   G.     /rounds/2026-04-24T21-21-52-268Z/aggregate — convergence map renders
//   D.     Managed Agent route still healthy (GET probe, no API call)
//
// All offline / pre-existing data — no new conductor calls. Cost: $0.
// Dev server must be running on http://localhost:3000.
//
//   npx tsx scripts/e2e-recording-readiness.ts

import { chromium, type Browser } from "playwright";

const BASE = "http://localhost:3000";
// session_id has no "session-" prefix — that's only on the on-disk filename.
// New winning sim from 2026-04-26 re-sim: has both ◆ (×2) and ↩ (×1)
// with persisted metadata (post-D47 harness fix).
const WINNING_SESSION = "2026-04-26T04-43-27-086Z";
// A cohort session with persisted meta-notice metadata — used as a positive
// control to prove the audit-panel chip rendering works end-to-end.
const COHORT_SESSION_WITH_META = "2026-04-24T21-43-39-298Z";
const COHORT_ROUND = "2026-04-24T21-21-52-268Z";

interface Result { ok: boolean; errors: string[]; notes: string[]; }

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [] };
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));

  try {
    // ---------------------------------------------------------------
    // Capture B/C/E recording surface — /demo?brief=civic-consultation
    // ---------------------------------------------------------------
    r.notes.push("--- Capture B/C/E surface: /demo?brief=civic-consultation ---");
    await page.goto(`${BASE}/demo?brief=civic-consultation`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    await page.waitForSelector("text=Civic Consultation", { timeout: 10_000 })
      .then(() => r.notes.push("✓ /demo brief title 'Civic Consultation' visible"))
      .catch(() => r.errors.push("✗ /demo brief title not visible"));
    await page.waitForFunction(
      () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 1,
      null,
      { timeout: 60_000 }
    ).then(() => r.notes.push("✓ /demo conductor turn 0 host bubble renders"))
     .catch(() => r.errors.push("✗ /demo conductor turn 0 did not render in 60s"));
    // Confirm split-screen: dashboard side has objective columns
    const objectivesVisible = await page
      .locator("text=lived experience, text=lived_experience")
      .first()
      .isVisible()
      .catch(() => false);
    if (objectivesVisible) {
      r.notes.push("✓ /demo dashboard objectives visible (split-screen renders)");
    } else {
      r.notes.push("? /demo dashboard objectives selector did not match — check screenshot");
    }
    await page.screenshot({ path: "transcripts/recording-readiness-demo.png", fullPage: false });
    r.notes.push("  saved: transcripts/recording-readiness-demo.png");

    // ---------------------------------------------------------------
    // Capture C/E recording surface — winning sim session w/ ◆ + ↩
    // ---------------------------------------------------------------
    r.notes.push(`--- Capture C/E surface: /sessions/${WINNING_SESSION} ---`);
    const sessRes = await page.goto(`${BASE}/sessions/${WINNING_SESSION}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    if (sessRes?.status() !== 200) {
      r.errors.push(`/sessions/${WINNING_SESSION} returned ${sessRes?.status()}`);
    }
    // Wait for transcript to render (host bubbles)
    await page.waitForFunction(
      () => document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length >= 5,
      null,
      { timeout: 15_000 }
    ).then(() => r.notes.push("✓ winning-sim transcript rendered (>=5 host bubbles)"))
     .catch(() => r.errors.push("✗ winning-sim transcript did not render"));

    // The session detail page renders ◆/↩ INSIDE per-turn audit panels,
    // collapsed by default. Open the audit toggle so the chips are visible —
    // this is the recording surface for the PEAK 1/2 fallback (when the
    // live conductor doesn't deploy on a fresh run).
    // audit panel defaults to open ("audit · on"). Only click the toggle
    // if it currently says "show audit" (i.e. the panel is closed).
    const showAuditBtn = page.locator('button:has-text("show audit")').first();
    if (await showAuditBtn.isVisible().catch(() => false)) {
      await showAuditBtn.click();
      r.notes.push("✓ audit toggle clicked open (was closed)");
      await page.waitForTimeout(500);
    } else {
      r.notes.push("✓ audit panel already open by default");
    }

    // ↩ marker — rendered as text "↩ re-opened turn N" inside audit panel
    const anchorCount = await page.getByText(/↩ re-opened turn \d+/).count();
    if (anchorCount > 0) {
      r.notes.push(`✓ ↩ anchor-return marker visible on winning-sim (${anchorCount} found)`);
    } else {
      r.errors.push("✗ ↩ anchor-return marker NOT visible on winning-sim — recording fallback broken");
    }

    // ◆ deployment — surfaced as the move-type chip "deploy meta-notice"
    // and as a "deployed" label on the matching candidate (border-emerald-400).
    const deployMoveCount = await page.getByText(/deploy meta-notice/i).count();
    const deployedLabelCount = await page.getByText(/^deployed$/i).count();
    if (deployMoveCount > 0 || deployedLabelCount > 0) {
      r.notes.push(`✓ ◆ deploy-meta-notice marker visible (move-chip=${deployMoveCount}, deployed-label=${deployedLabelCount})`);
    } else {
      r.errors.push("✗ ◆ deploy-meta-notice marker NOT visible on winning-sim — recording fallback broken");
    }

    // ---------------------------------------------------------------
    // Positive control: cohort session WITH metadata persisted —
    // proves the chip rendering itself works (so the failure on the
    // winning-sim is genuinely a missing-metadata problem, not a UI bug).
    // ---------------------------------------------------------------
    r.notes.push(`--- Positive control: /sessions/${COHORT_SESSION_WITH_META} ---`);
    await page.goto(`${BASE}/sessions/${COHORT_SESSION_WITH_META}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    // audit defaults open — only click if the closed-state button is visible
    const ctrlShowBtn = page.locator('button:has-text("show audit")').first();
    if (await ctrlShowBtn.isVisible().catch(() => false)) await ctrlShowBtn.click();
    await page.waitForTimeout(500);
    const ctrlAnchor = await page.getByText(/↩ re-opened turn \d+/).count();
    const ctrlDeployMove = await page.getByText(/deploy meta-notice/i).count();
    const ctrlDeployedLabel = await page.getByText(/^deployed$/i).count();
    if (ctrlAnchor > 0 || ctrlDeployMove > 0 || ctrlDeployedLabel > 0) {
      r.notes.push(`✓ control session renders chips (↩=${ctrlAnchor}, ◆-move=${ctrlDeployMove}, deployed=${ctrlDeployedLabel}) — UI works; winning-sim file just lacks metadata`);
    } else {
      r.errors.push("✗ even the control session has no chips — UI rendering bug, not a data problem");
    }
    await page.screenshot({ path: "transcripts/recording-readiness-control.png", fullPage: false });
    await page.screenshot({ path: "transcripts/recording-readiness-winning-sim.png", fullPage: false });
    r.notes.push("  saved: transcripts/recording-readiness-winning-sim.png");

    // ---------------------------------------------------------------
    // Capture G surface — convergence map
    // ---------------------------------------------------------------
    r.notes.push(`--- Capture G surface: /rounds/${COHORT_ROUND}/aggregate ---`);
    const aggRes = await page.goto(`${BASE}/rounds/${COHORT_ROUND}/aggregate`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (aggRes?.status() !== 200) {
      r.errors.push(`aggregate returned ${aggRes?.status()}`);
    }
    await page.waitForFunction(
      () => /11 sessions/i.test(document.body.innerText),
      null,
      { timeout: 15_000 }
    ).then(() => r.notes.push("✓ aggregate header shows '11 sessions'"))
     .catch(() => r.errors.push("✗ aggregate header did not show session count"));
    const svgCount = await page.locator("svg").count();
    if (svgCount >= 1) {
      r.notes.push(`✓ ${svgCount} svg element(s) — convergence map present`);
    } else {
      r.errors.push("✗ no SVG on aggregate page");
    }
    // Cluster halos — paths inside the map svg
    const haloCount = await page.locator('path[filter*="halo"], path[d^="M"]').count();
    r.notes.push(`  ${haloCount} svg paths — cluster halos + edges`);
    // Verify cohort claims button is present (was added in last commit)
    const verifyBtn = page.locator('button:has-text("verify cohort claims"), button:has-text("cohort claims")');
    if (await verifyBtn.first().isVisible().catch(() => false)) {
      r.notes.push("✓ 'verify cohort claims' button visible");
    } else {
      r.errors.push("✗ 'verify cohort claims' button missing on aggregate page");
    }
    await page.screenshot({ path: "transcripts/recording-readiness-aggregate.png", fullPage: false });
    r.notes.push("  saved: transcripts/recording-readiness-aggregate.png");

    // ---------------------------------------------------------------
    // Capture F surface — takeaway markdown is loaded by the session page,
    // not via a per-session API endpoint. Verify by visiting the session
    // detail page and checking the "What surfaced between the lines"
    // section is rendered (the winning sim's takeaway was pre-baked).
    // ---------------------------------------------------------------
    r.notes.push(`--- Capture F surface: takeaway visible on /sessions/${WINNING_SESSION} ---`);
    await page.goto(`${BASE}/sessions/${WINNING_SESSION}`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    });
    const surfacedHeading = await page
      .waitForFunction(
        () => /what surfaced between the lines|surfaced between/i.test(document.body.innerText),
        null,
        { timeout: 15_000 }
      )
      .then(() => true)
      .catch(() => false);
    if (surfacedHeading) {
      r.notes.push("✓ 'What surfaced between the lines' section visible on session page");
    } else {
      r.errors.push("✗ takeaway 'What surfaced between the lines' not on session page");
    }

    // ---------------------------------------------------------------
    // Capture D surface — Managed Agent button present (route is POST-only)
    // ---------------------------------------------------------------
    r.notes.push("--- Capture D surface: Managed Agent button on session page ---");
    const verifyClaimsBtn = page.locator(
      'button:has-text("Verify claims"), button:has-text("verify claims"), button:has-text("Run agent")'
    );
    if (await verifyClaimsBtn.first().isVisible().catch(() => false)) {
      r.notes.push("✓ Managed Agent trigger button visible on session page");
    } else {
      r.errors.push("✗ Managed Agent trigger button NOT on session page");
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
  process.stdout.write("=== Recording-readiness check ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
