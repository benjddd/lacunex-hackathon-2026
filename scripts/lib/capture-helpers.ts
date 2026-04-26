// Shared helpers for the Playwright recording scripts (capture-{b,c,e,f,g,h}).
// All capture scripts target a webm under transcripts/captures/<letter>/ at
// 1920×1080. Helpers here:
//   - injectFakeCursor: renders a visible cursor inside the page so cursor
//     movement is captured in the webm (Playwright doesn't record OS cursor)
//   - typeLikeAHuman: types into a locator with per-keystroke jitter and
//     mid-sentence pauses, so the participant feels like a person not a bot
//   - smoothScrollIntoView: page.evaluate-driven smooth scroll to an element
//   - finaliseRecording: closes context, surfaces the saved webm path
//
// All scripts run against http://localhost:3000 — dev server must be up.

import type { BrowserContext, Locator, Page } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs";

// ---- Fake cursor (so the recording shows where the cursor is) ----

const FAKE_CURSOR_SCRIPT = `
(() => {
  if (document.getElementById('__pw_fake_cursor')) return;
  const c = document.createElement('div');
  c.id = '__pw_fake_cursor';
  Object.assign(c.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'rgba(20,20,20,0.85)',
    border: '2px solid white',
    boxShadow: '0 0 6px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
    zIndex: '2147483647',
    transform: 'translate(-50%, -50%)',
    transition: 'left 80ms ease-out, top 80ms ease-out, background 120ms',
  });
  document.body.appendChild(c);
  const move = (e) => {
    c.style.left = e.clientX + 'px';
    c.style.top  = e.clientY + 'px';
  };
  document.addEventListener('mousemove', move, true);
  document.addEventListener('mousedown', () => { c.style.background = 'rgba(220,80,40,0.95)'; }, true);
  document.addEventListener('mouseup',   () => { c.style.background = 'rgba(20,20,20,0.85)'; }, true);
})();
`;

export async function injectFakeCursor(context: BrowserContext): Promise<void> {
  await context.addInitScript({ content: FAKE_CURSOR_SCRIPT });
}

// ---- Human-pace typing ----
//
// Real people type ~40–80 WPM (200–400 chars/min ≈ 150–300 ms per char). A
// pure constant-rate stream still looks robotic, so we add per-keystroke
// jitter and longer pauses on punctuation. We also pause briefly between
// sentences — the participant in the sim transcript is reflecting, not
// transcribing dictation.

interface TypingOptions {
  /** mean ms per keystroke. Default 55 — about 65 wpm. */
  baseDelayMs?: number;
  /** ± jitter range around baseDelayMs. Default 35. */
  jitterMs?: number;
  /** extra pause after `,` `;` `—`. Default 90. */
  midSentencePauseMs?: number;
  /** extra pause after `.` `?` `!`. Default 280. */
  sentencePauseMs?: number;
  /** brief pre-typing think time before the first keystroke. Default 600. */
  preTypingPauseMs?: number;
}

export async function typeLikeAHuman(
  locator: Locator,
  text: string,
  opts: TypingOptions = {}
): Promise<void> {
  const base   = opts.baseDelayMs   ?? 55;
  const jitter = opts.jitterMs      ?? 35;
  const midP   = opts.midSentencePauseMs ?? 90;
  const sentP  = opts.sentencePauseMs    ?? 280;
  const preP   = opts.preTypingPauseMs   ?? 600;

  await locator.click();
  await locator.page().waitForTimeout(preP);

  for (const ch of text) {
    const baseJitter = Math.round((Math.random() * 2 - 1) * jitter);
    const baseDelay  = Math.max(15, base + baseJitter);
    await locator.pressSequentially(ch, { delay: baseDelay });
    if (ch === "." || ch === "?" || ch === "!") {
      await locator.page().waitForTimeout(sentP);
    } else if (ch === "," || ch === ";" || ch === "—" || ch === ":") {
      await locator.page().waitForTimeout(midP);
    }
  }
}

// ---- Smooth scroll ----

export async function smoothScrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((targetY) => {
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }, y);
}

export async function smoothScrollToSelector(
  page: Page,
  selector: string
): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
  }, selector);
}

// ---- Recording paths ----

export interface CaptureSetup {
  /** absolute dir where Playwright drops the auto-named webm */
  videoDir: string;
  /** absolute path the saved webm should be moved to (printed at end) */
  finalPath: string;
}

export function captureSetup(captureLetter: string, slug: string): CaptureSetup {
  const root = path.join(process.cwd(), "transcripts", "captures", `capture-${captureLetter}`);
  fs.mkdirSync(root, { recursive: true });
  return {
    videoDir: root,
    finalPath: path.join(root, `${slug}.webm`),
  };
}

// Playwright auto-names the recorded video. Once context.close() resolves,
// we rename the .webm to a stable filename and print it.
export async function finaliseRecording(
  page: Page,
  context: BrowserContext,
  setup: CaptureSetup
): Promise<string> {
  const video = page.video();
  await context.close();
  if (!video) throw new Error("page.video() returned null — was recordVideo enabled?");
  const tmpPath = await video.path();
  fs.renameSync(tmpPath, setup.finalPath);
  return setup.finalPath;
}
