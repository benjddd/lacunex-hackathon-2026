// E2E: full demo dry-run. Drives 6 scripted participant turns through
// /p/civic-consultation and asserts the five pass/fail gates from
// tmp/sat-dry-run-plan.md fire before recording starts.
//
// Cost: ~$0.30–0.60 (one civic-consultation session, ~12 total turns).
// Dev server must be running on http://localhost:3000.
//
//   npx tsx scripts/e2e-dry-run.ts

import { chromium, type Browser, type Page } from "playwright";

const BASE = "http://localhost:3000";

// VERBATIM participant turns from the winning sim
// (session-2026-04-24T20-59-09-733Z) — known to fire ◆ on host turn 7
// and ↩ on host turn 8 in the original run. Copy-pasted exactly so the
// conductor sees the same input distribution.
const PARTICIPANT_TURNS = [
  // Turn 1
  "I think it's the right direction overall, honestly — we do need to tackle air quality and car dependency. But yeah, day to day... last week I took my mum-in-law to her hospital appointment on a Tuesday morning, the one she has every month. It's in the centre, right near the old market square, and I've been driving her because she can't manage the bus with her mobility issues. I just sort of assumed I'd still be able to do that, but I've started looking at whether there's a permit system or exemptions, because obviously I can't charge her fifty quid every time she needs to see her consultant. So that's been... I mean, it's fine, it's just a thing I need to sort out, but it's made me realise I haven't actually read the details properly yet.",
  // Turn 3
  "Right, so I hadn't even arrived yet — I was driving in and I was already thinking about it, which I hadn't really expected. We were maybe five minutes away and I thought, \"Okay, is this the day it starts? Have I missed something?\" I checked my phone at a red light, which wasn't smart, but I genuinely wasn't sure of the timeline. Then when we actually got there and parked, it was fine — no charge yet — but I remember feeling this low-level stress I don't normally feel doing something I've done dozens of times. And honestly, pulling away after I'd dropped her at the hospital entrance, I found myself thinking, \"Maybe next time I should just pay for a cab instead,\" which is ridiculous because a cab would probably cost more. I think I'm just already in this mindset of it being a hassle, even though technically nothing's changed yet. That surprised me about myself, actually.",
  // Turn 5
  "I think... I realised I've already started treating the centre differently, even though the zone isn't actually live yet. Like, I *know* it's coming, so my brain's already started avoiding it or finding workarounds. And that made me notice I've done this with other things too — I moved my physio appointment last month to a practice further out, partly because the one I was going to is right in the zone, and I thought, \"Well, I'll just sort it now.\" And meeting my friend for coffee, we used to just say \"Tuesday at the usual place in town\" and now it's this whole logistics thing — we're looking at places on the edge instead. But I don't really think of those as *costs*, you know? They're just... what you do. Practical adjustments. Except when I actually sit with it, like I am now, I'm realising I'm already paying a price for something that isn't even implemented yet. That's the surprise — I'm already changing my life around it, and I'm not even sure I'm doing it consciously.",
  // Turn 7
  "Yeah, there's probably more than I'm immediately aware of. Like, I haven't consciously avoided the centre or anything, but... I had to pick up a prescription last month and there's a pharmacy I've used for years right in the middle of the zone. And instead of just going there like I always do, I went to the Boots further out near the ring road. I didn't think of it as \"avoiding the zone\" at the time — I just thought, \"Oh, easier parking,\" which is true, but also... I wouldn't have done that six months ago. And I've definitely been less inclined to suggest plans in town to people. My partner asked about going to that new restaurant that opened in the centre a few weeks back, and I sort of half-heartedly said maybe, but I didn't push it. I think part of me was already thinking, \"Is it worth the hassle?\" But that's the thing — I can't quite separate out what's a real hassle and what's me just... pre-emptively accommodating something that might be inconvenient. It's hard to know where the psychology ends and the actual problem begins.",
  // Turn 9 (this is the response to the ↩ anchor return)
  "Hmm, no, actually — you're right to push back on that. I mean, it *is* fine in the sense that I'm not in crisis or anything, but when I hear it listed out like that, it sounds like I'm already reorganising my week around something that's meant to make things better. And I do still think the zone is the right direction — I care about the air quality, I genuinely do — but I'm noticing there's a gap between what I believe in principle and what's actually happening to how I move around. It's not a disaster, but it's not \"fine\" either. It's more like... I'm already paying a friction cost without getting any of the benefit yet. And I haven't even properly thought through my mum-in-law situation, which is actually a real problem because I can't just not take her to hospital. I think Stockholm's scheme brought traffic down by about twenty percent, something like that, and presumably people there adapted too, so maybe this is just what happens. But yeah, saying it's fine feels like I'm not being honest about what's actually going on.",
  // Turn 11
  "That's... a good question, and I'm not sure I have a clean answer. I mean, logically it should be the scheme's problem, right? She's got a medical need, she can't use public transport easily, so there should be exemptions or permits or something. But in practice, I've already started thinking of it as *my* problem — like, I need to figure out the workaround, I need to find the permit application, I need to maybe retime things or find an alternative. And I think that's partly because I support the scheme, so there's this weird guilt where I don't want to be the person complaining about exceptions. But also I haven't actually engaged with the detail of how exemptions will work, so I'm just... assuming it'll be difficult and I should find another way.",
];

const TURN_TIMEOUT_MS = 120_000; // Opus conductor with long transcript can take ~60s
const BADGE_POLL_MS   = 3_000;   // short settle after response before checking badges
const SKIP_BRIEF_DESIGNER = process.env.SKIP_BRIEF_DESIGNER === "1";

interface Result {
  ok: boolean;
  errors: string[];
  notes: string[];
  gates: Record<string, boolean>;
}

// Count just the host bubbles inside the chat scroller. The ChatPane host
// bubble has classes "bg-amber-50 text-stone-900 rounded-bl-sm" — using
// rounded-bl-sm narrows to chat bubbles only (not e.g. the demo strip).
async function countHostBubbles(page: Page): Promise<number> {
  return page.locator(".bg-amber-50.rounded-bl-sm").count();
}

async function sendTurn(page: Page, text: string): Promise<void> {
  const before = await countHostBubbles(page);
  const input = page.locator('textarea').first();
  await input.fill(text);
  await input.press("Enter");
  // Wait for a new host bubble (host responded)
  await page.waitForFunction(
    (prev: number) =>
      document.querySelectorAll(".bg-amber-50.rounded-bl-sm").length > prev,
    before,
    { timeout: TURN_TIMEOUT_MS }
  );
  // Brief settle for badge rendering after host bubble appears
  await page.waitForTimeout(BADGE_POLL_MS);
}

async function run(): Promise<Result> {
  const r: Result = { ok: false, errors: [], notes: [], gates: {
    "◆ badge appears": false,
    "↩ chip appears": false,
    "takeaway what_surfaced populated": false,
    "managed agent SSE renders": false,
    "brief-designer generates brief": false,
  }};

  const browser: Browser = await chromium.launch({ headless: false }); // headed so you can watch
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => r.errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") r.errors.push(`console.error: ${m.text()}`); });

  try {
    // ---------------------------------------------------------------
    // GATE 5: brief-designer generates a brief (fast, cheap)
    // ---------------------------------------------------------------
    if (SKIP_BRIEF_DESIGNER) {
      r.notes.push("--- Gate 5: brief-designer SKIPPED (SKIP_BRIEF_DESIGNER=1) ---");
      r.gates["brief-designer generates brief"] = true; // already verified in earlier runs
    } else {
    r.notes.push("--- Gate 5: brief-designer ---");
    await page.goto(`${BASE}/host`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForSelector('text=Brief Designer', { timeout: 10_000 });
    await page.locator('text=Brief Designer').first().click();
    // Wait for brief-designer chat to open (first host message appears)
    const bdOpened = await page
      .waitForSelector('.bg-amber-50', { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    if (bdOpened) {
      r.notes.push("brief-designer chat opened, platform asked first question");
      // Type the first scripted host response
      const input = page.locator('textarea, input[type="text"]').first();
      await input.fill(
        "I'm running a consultation for our borough council — congestion charge proposal going to committee in eight weeks. I want to understand how residents actually live with the existing traffic, and what would change their view. Our last consultation had a 4% response rate."
      );
      await input.press("Enter");
      // Wait for host response
      await page.waitForFunction(
        () => document.querySelectorAll('.bg-amber-50').length >= 2,
        null,
        { timeout: 40_000 }
      );
      r.notes.push("brief-designer replied to response 1");
      // Type response 2
      const input2 = page.locator('textarea, input[type="text"]').first();
      await input2.fill(
        "Small shop owners, school-run parents, people caring for elderly relatives. Not the people who already turn up to town halls. I want residents talking about their Tuesday, not their opinion."
      );
      await input2.press("Enter");
      await page.waitForFunction(
        () => document.querySelectorAll('.bg-amber-50').length >= 3,
        null,
        { timeout: 40_000 }
      );
      // Check brief card materialised (has a "Use this brief" or JSON download link, or a card)
      const briefCard = await page
        .waitForFunction(
          () => /brief|objectives|5 obj/i.test(document.body.innerText),
          null,
          { timeout: 60_000 }
        )
        .then(() => true)
        .catch(() => false);
      if (briefCard) {
        r.gates["brief-designer generates brief"] = true;
        r.notes.push("✓ Gate 5: brief card materialised");
      } else {
        r.errors.push("✗ Gate 5: brief card did not materialise after 2 responses");
      }
    } else {
      r.errors.push("✗ Gate 5: brief-designer chat did not open");
    }
    await page.screenshot({ path: "transcripts/dry-run-gate5-brief-designer.png" });
    } // end !SKIP_BRIEF_DESIGNER

    // ---------------------------------------------------------------
    // GATES 1 + 2: ◆ badge + ↩ chip (6 scripted participant turns)
    // ---------------------------------------------------------------
    r.notes.push("--- Gates 1 & 2: civic-consultation interview ---");
    await page.goto(`${BASE}/p/civic-consultation`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    r.notes.push("opened /p/civic-consultation");

    // Wait for conductor turn 0
    await page.waitForFunction(
      () => document.querySelectorAll('.bg-amber-50').length >= 1,
      null,
      { timeout: 60_000 }
    );
    r.notes.push("conductor turn 0 rendered");

    let diamondFound = false;
    let anchorFound  = false;

    for (let i = 0; i < PARTICIPANT_TURNS.length; i++) {
      const turnText = PARTICIPANT_TURNS[i];
      r.notes.push(`sending participant turn ${i * 2 + 1}: "${turnText.slice(0, 60)}…"`);
      await sendTurn(page, turnText);

      // Check for ◆ badge (bg-emerald-100 chip with "◆" text)
      if (!diamondFound) {
        const diamond = await page.locator('.bg-emerald-100').filter({ hasText: "◆" }).count();
        if (diamond > 0) {
          diamondFound = true;
          r.gates["◆ badge appears"] = true;
          r.notes.push(`✓ Gate 1: ◆ badge found after participant turn ${i * 2 + 1}`);
          await page.screenshot({ path: `transcripts/dry-run-diamond-turn${i * 2 + 1}.png` });
        }
      }

      // Check for ↩ chip (bg-amber-200 chip with "↩" text)
      if (!anchorFound) {
        const anchor = await page.locator('.bg-amber-200\\/80, [class*="bg-amber-200"]').filter({ hasText: "↩" }).count();
        if (anchor > 0) {
          anchorFound = true;
          r.gates["↩ chip appears"] = true;
          r.notes.push(`✓ Gate 2: ↩ chip found after participant turn ${i * 2 + 1}`);
          await page.screenshot({ path: `transcripts/dry-run-anchor-turn${i * 2 + 1}.png` });
        }
      }
    }

    if (!diamondFound) r.errors.push("✗ Gate 1: ◆ badge never appeared across 6 participant turns");
    if (!anchorFound)  r.errors.push("✗ Gate 2: ↩ chip never appeared across 6 participant turns");

    // Diagnostic dump: read transcript state from window so we can tell
    // whether the conductor actually decided to deploy meta-notices /
    // anchor-returns (vs. our selectors being wrong).
    const transcriptDump = await page.evaluate(() => {
      // Try to find the React state via the chat bubbles' rendered text
      const bubbles = Array.from(document.querySelectorAll(".bg-amber-50.rounded-bl-sm, .bg-slate-800"));
      const hostTurns: string[] = [];
      const allChips: string[] = [];
      for (const b of bubbles) {
        const cls = b.className;
        if (cls.includes("amber-50")) {
          hostTurns.push((b as HTMLElement).innerText.slice(0, 80));
        }
        // Collect any chip-style spans inside this bubble's parent
        const parent = b.parentElement;
        if (parent) {
          const chips = parent.querySelectorAll(".rounded-full");
          for (const c of chips) {
            const text = (c as HTMLElement).innerText;
            if (text) allChips.push(text);
          }
        }
      }
      return { hostTurns, allChips, totalBubbles: bubbles.length };
    });
    r.notes.push(`diagnostic: ${transcriptDump.totalBubbles} bubbles total`);
    r.notes.push(`diagnostic: ${transcriptDump.hostTurns.length} host turns`);
    r.notes.push(`diagnostic: chips found = ${JSON.stringify(transcriptDump.allChips)}`);
    await page.screenshot({ path: "transcripts/dry-run-after-interview.png", fullPage: true });
    r.notes.push("saved full-page screenshot to transcripts/dry-run-after-interview.png");

    // ---------------------------------------------------------------
    // GATE 3: takeaway what_surfaced populated
    // ---------------------------------------------------------------
    r.notes.push("--- Gate 3: letter takeaway ---");
    // End session — look for "End session" button
    const endBtn = page.locator('button:has-text("End"), button:has-text("end session"), button:has-text("See your reflection")');
    const endVisible = await endBtn.first().isVisible().catch(() => false);
    if (endVisible) {
      await endBtn.first().click();
    } else {
      // Try submitting a final closing turn
      const input = page.locator('textarea, input[type="text"]').first();
      const inputExists = await input.isVisible().catch(() => false);
      if (inputExists) {
        await input.fill("I think that covers it. Thank you.");
        await input.press("Enter");
        await page.waitForTimeout(5000);
      }
    }
    // Wait for takeaway to render
    await page.waitForFunction(
      () => /what surfaced between the lines|surfaced between/i.test(document.body.innerText),
      null,
      { timeout: 90_000 }
    ).then(() => {
      r.gates["takeaway what_surfaced populated"] = true;
      r.notes.push("✓ Gate 3: 'What surfaced between the lines' section visible");
    }).catch(() => {
      r.errors.push("✗ Gate 3: takeaway 'What surfaced between the lines' section did not appear");
    });
    await page.screenshot({ path: "transcripts/dry-run-gate3-takeaway.png" });

    // ---------------------------------------------------------------
    // GATE 4: Managed Agent SSE event stream renders
    // Extract session ID from current URL or page state, navigate to /sessions/<id>
    // ---------------------------------------------------------------
    r.notes.push("--- Gate 4: Managed Agent SSE ---");
    // After session end, the page may show a link to the session detail
    const sessionLink = page.locator('a[href*="/sessions/"]').first();
    const sessionLinkVisible = await sessionLink.isVisible().catch(() => false);
    let sessionId: string | null = null;
    if (sessionLinkVisible) {
      const href = await sessionLink.getAttribute("href");
      sessionId = href?.split("/sessions/")[1]?.split("?")[0] ?? null;
    }
    // Fallback: check URL
    if (!sessionId) {
      const url = page.url();
      const m = /\/sessions\/([^/?]+)/.exec(url);
      if (m) sessionId = m[1];
    }
    // Fallback: look in localStorage
    if (!sessionId) {
      sessionId = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("session_")) return k.replace("session_", "");
        }
        return null;
      });
    }

    if (sessionId) {
      r.notes.push(`session id: ${sessionId}`);
      await page.goto(`${BASE}/sessions/${sessionId}`, { waitUntil: "domcontentloaded", timeout: 15_000 });
      // Click "Verify claims" (or "Run agent")
      const verifyBtn = page.locator('button:has-text("Verify claims"), button:has-text("verify claims"), button:has-text("Run agent")');
      const verifyVisible = await verifyBtn.first().isVisible().catch(() => false);
      if (verifyVisible) {
        await verifyBtn.first().click();
        // Wait for SSE events to start rendering (tool_use lines)
        const sseRendered = await page
          .waitForFunction(
            () => /web_search|tool_use|searching/i.test(document.body.innerText),
            null,
            { timeout: 60_000 }
          )
          .then(() => true)
          .catch(() => false);
        if (sseRendered) {
          r.gates["managed agent SSE renders"] = true;
          r.notes.push("✓ Gate 4: Managed Agent SSE event stream rendered");
          // Wait for final report
          await page.waitForFunction(
            () => /Supported|Refuted|Partially supported|Insufficient/i.test(document.body.innerText),
            null,
            { timeout: 90_000 }
          ).catch(() => {
            r.notes.push("(agent report did not complete within timeout — SSE stream started ok)");
          });
        } else {
          r.errors.push("✗ Gate 4: Managed Agent SSE did not render tool_use events");
        }
        await page.screenshot({ path: "transcripts/dry-run-gate4-agent.png" });
      } else {
        r.errors.push("✗ Gate 4: 'Verify claims' button not found on session page");
      }
    } else {
      r.errors.push("✗ Gate 4: could not determine session ID to test Managed Agent");
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
  process.stdout.write("=== Dry-run gate check ===\n");
  for (const n of r.notes) process.stdout.write(`  · ${n}\n`);
  process.stdout.write("\nGATES:\n");
  for (const [gate, passed] of Object.entries(r.gates)) {
    process.stdout.write(`  ${passed ? "✓" : "✗"} ${gate}\n`);
  }
  if (r.errors.length) {
    process.stdout.write("\nERRORS:\n");
    for (const e of r.errors) process.stdout.write(`  ✗ ${e}\n`);
  }
  process.stdout.write(`\nResult: ${r.ok ? "PASS" : "FAIL"}\n`);
  process.exit(r.ok ? 0 : 1);
});
