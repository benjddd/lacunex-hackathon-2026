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
  // addInitScript runs at document_start, before HTML parsing creates
  // <html>, <head>, or <body>. So every DOM-touching call here must wait
  // for the relevant ancestor to exist, or it throws and the whole IIFE
  // dies — which previously caused our "1 issue" page error AND prevented
  // the dev-UI-hide stylesheet from ever being injected.

  // Hide Next.js dev-mode UI (belt-and-braces; primary fix is
  // devIndicators:false in next.config.ts). The host elements are in
  // light DOM, so a single CSS rule on the host hides the whole portal.
  let styleInstalled = false;
  const installStyle = () => {
    if (styleInstalled) return true;
    const root = document.head || document.documentElement;
    if (!root) return false; // try again later
    if (document.getElementById('__pw_hide_next_dev_ui')) { styleInstalled = true; return true; }
    const s = document.createElement('style');
    s.id = '__pw_hide_next_dev_ui';
    s.textContent = \`
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-toast-wrapper],
      [data-next-mark],
      [data-next-mark-loading],
      [data-nextjs-dev-tools-button],
      [data-nextjs-dialog-overlay],
      [data-nextjs-error-overlay],
      [data-issues-collapse],
      [data-issues-popover],
      #__next-build-watcher,
      #__next-prerender-indicator { display: none !important; visibility: hidden !important; pointer-events: none !important; }
    \`;
    root.appendChild(s);
    styleInstalled = true;
    return true;
  };

  // Render a visible cursor inside the page so Playwright's mouse moves
  // are captured in the recorded webm (Playwright doesn't render the OS
  // cursor onto the page). Uses a conventional arrow shape so viewers read
  // it as "cursor" instantly — a circle reads as "click target" or "spot
  // highlight" instead. Inline SVG keeps it crisp at any zoom.
  //
  // The arrow is positioned so its tip is at (lastX, lastY): translate
  // (-2px, -2px) accounts for the small pad around the arrow path.
  let cursorEl = null;
  let lastX = 0, lastY = 0;
  const CURSOR_SVG = \`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.55));">
      <path d="M 5 3 L 5 22 L 10 17 L 13.5 24 L 16 22.6 L 12.5 16 L 19 16 Z"
            fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>\`;
  const installCursor = () => {
    if (cursorEl) return true;
    if (!document.body) return false; // try again later
    const existing = document.getElementById('__pw_fake_cursor');
    if (existing) { cursorEl = existing; return true; }
    const c = document.createElement('div');
    c.id = '__pw_fake_cursor';
    c.innerHTML = CURSOR_SVG;
    Object.assign(c.style, {
      position: 'fixed',
      left: lastX + 'px',
      top: lastY + 'px',
      width: '28px',
      height: '28px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      // Tip of the arrow path is at (5,3) in the 28-unit viewBox.
      // Offset the element so its (5,3) point lands at the cursor coord.
      transform: 'translate(-5px, -3px)',
      transition: 'left 90ms ease-out, top 90ms ease-out',
    });
    document.body.appendChild(c);
    cursorEl = c;
    return true;
  };

  // Single retry loop: tries every animation frame until both succeed,
  // then stops. Tolerates document_start (body still null), late
  // hydration, and SPA navigations that tear down/rebuild the body.
  const tryInstall = () => {
    let done = true;
    if (!installStyle())  done = false;
    if (!installCursor()) done = false;
    if (!done) {
      // requestAnimationFrame is the cheapest "next tick" that survives
      // missing body — fall back to setTimeout if rAF isn't available yet
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tryInstall);
      else setTimeout(tryInstall, 16);
    }
  };

  // Capture mouse position from window-level events even before the cursor
  // div is mounted, so when it does mount it already knows where the cursor is.
  const onMove = (e) => {
    lastX = e.clientX; lastY = e.clientY;
    if (cursorEl) {
      cursorEl.style.left = lastX + 'px';
      cursorEl.style.top  = lastY + 'px';
    }
  };
  const onDown = () => { if (cursorEl) cursorEl.style.background = 'rgba(220,80,40,0.95)'; };
  const onUp   = () => { if (cursorEl) cursorEl.style.background = 'rgba(20,20,20,0.88)'; };

  // Install handlers on window so they catch every event (capture phase) on
  // both light and shadow DOM through composedPath bubbling.
  // window must exist (it always does in a browser context) — this can't fail.
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('mouseup',   onUp,   true);

  tryInstall();

  // Re-run after navigation events in case the body was rebuilt. We
  // reset cursorEl/styleInstalled so the install funcs re-create.
  const reinstall = () => {
    if (cursorEl && !cursorEl.isConnected) cursorEl = null;
    if (!document.getElementById('__pw_hide_next_dev_ui')) styleInstalled = false;
    tryInstall();
  };
  document.addEventListener('readystatechange', reinstall);
  document.addEventListener('DOMContentLoaded', reinstall);
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
