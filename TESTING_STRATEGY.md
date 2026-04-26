# Testing strategy — pre-submit walkability

**Goal:** prove that every journey claimed in the README, demo video, and submission can be reproduced by a fresh judge clicking through the UI — with no scripts, no curl, no sessionStorage hand-poking, and no pre-seeded data beyond what the repo ships with.

The risk surfaced by the user before this audit:
> "We generated a lot of data which can be accessed by direct links, but this is not reproducible via UI by a real person (because we mostly tested the endpoints by scripts directly)."

This document is the answer: what we test, how we test it, what we found, and what to re-run before submit.

---

## 1. Journeys covered

| ID | Journey | What it proves |
|----|---------|----------------|
| **A** | Participant via invite | `/host` → invite link → `/i/{token}` → `/p/{brief}` → 2-turn chat → End → **takeaway letter renders** |
| **B** | Host round + aggregate | `/rounds` → New round → participant link → fresh session attached → **aggregate generated → convergence map opens** |
| **C** | `/demo` standalone | The split-screen demo opens without setup, conductor speaks, dashboard fills |
| **D** | Brief Designer recursive | `/host` → "design your brief" → `/p/brief-designer` → 4-turn chat → **brief artifact** → "run this brief" → new participant chat opens with the just-authored brief |
| **E** | One-shot brief generator | `/host` → "Skip the conversation" → 1-paragraph description → `/api/generate-brief` → "try as participant" → conductor opens |
| **X** | Cross-tab persistence | Same brief as E, opened in a fresh browser context (no sessionStorage). Confirms whether generated briefs survive a tab close. |

All journeys hit the live Anthropic API (no fixture replay) and persist real artifacts to `transcripts/`. Each Playwright run produces a fresh round + session + takeaway, demonstrating reproducibility from zero state.

---

## 2. How to run

```bash
npm run dev                          # in one terminal
npx tsx scripts/verify-journeys-e2e.ts   # in another
```

Flags:
- `ONLY=A,B` — run a subset
- `HEADLESS=0` — see the browser drive itself (debugging only)
- `BASE_URL=https://lacunex.com` — point at the deployed Vercel site instead of `localhost:3000`

On failure the harness writes screenshots + HTML to `tmp/verify-failure-{slug}/` for postmortem.

Total wall time on a warm dev server with live LLM calls: **~4–6 minutes**.

---

## 3. Findings (last run, 2026-04-26)

### Pass — 5 of 6
| Journey | Result | Evidence |
|---|---|---|
| A · Participant via invite | ✓ PASS (45s) | Real takeaway in `transcripts/takeaway-2026-04-26T18-35-20-695Z.md` — letter content includes the participant's verbatim "small adjustments" framing, plus a correctly-anchored *what surfaced between the lines* paragraph. |
| B · Host round + aggregate | ✓ PASS (59s) | Real round in `transcripts/rounds/round-2026-04-26T18-56-18-953Z.json` — 1 session, 5 themes, 3 patterns, 2 routing recommendations. Convergence map page renders against this fresh round. |
| C · /demo standalone | ✓ PASS (15s) | Conductor opens, dashboard pane shows extraction surface. No pre-seed required. |
| D · Brief Designer recursive | ✓ PASS (101s) | `/p/brief-designer` runs as a normal interview, the brief artifact materialises after wrap-up, "run this brief" navigates to `/p/gen-…` and the new conductor speaks. |
| E · One-shot generator | ✓ PASS (68s) | `/host` quick generator returns a valid brief, "try as participant" opens it. |

### Fail — 1 of 6 (genuine product gap, scoped impact)
| Journey | Result | Note |
|---|---|---|
| X · Cross-tab persistence | ✗ FAIL | A `/p/gen-{id}` URL opened in a *different browser context* shows "Unknown brief". Generated briefs live only in the originating tab's `sessionStorage`. |

**Impact analysis for X:**
- The 3 bundled briefs (Founder Investment Evaluation, Post-Incident Witness Interview, Civic Consultation) are NOT affected — they're statically imported into every page bundle.
- The host UI does NOT offer an "invite link" button on generated briefs (only the 3 static ones get invite buttons), so a host cannot accidentally hand a participant a broken link.
- The demo video does NOT show cross-device handoff of a generated brief; Beat 9's Brief Designer reveal stays inside one tab.
- The risk is limited to: (a) a judge bookmarking `/p/gen-…` and revisiting it, (b) a judge sharing a generated `/p/gen-…` URL with someone else expecting it to work.

**Mitigation options (none required for submit):**
1. Persist generated briefs server-side (KV) keyed by `gen-{id}` and have `/p/[templateId]` fall back to a fetch on sessionStorage miss.
2. Document the limitation in README under a "Known limitations" section.
3. Disable bookmarkability by attaching the brief payload to the URL hash (acceptable for short briefs).

For the hackathon submission this is **honest behaviour** that matches what the UI advertises — no remediation needed.

---

## 4. Mock-data audit — clean

Searched `src/` for `mock|fixture|TODO|XXX|HACK|hardcoded|stub|MOCK_|round-2026|session-2026`:
- No mock data, no hardcoded session/round IDs, no fixture references in source.
- The 4 brief JSON files in `src/templates/` are **brief definitions** (interview goals + persona), not interview data.
- `transcripts/` contains real persisted runs, but none are referenced from any UI route — they exist only for the demo video editor and the synthetic-cohort docs.
- The `domain_context` strings in each brief are real domain knowledge written by the team, not LLM stubs.

**Verdict:** every artifact a judge sees in the UI is generated live or comes from a brief schema they can read in source. Nothing is faked.

---

## 5. Pre-submit checklist

Run before the final video submit, ideally against the deployed Vercel URL:

- [ ] `npm run dev` is up (or set `BASE_URL` to the Vercel deployment)
- [ ] `npx tsx scripts/verify-journeys-e2e.ts` returns **5+ PASS** (X is permitted to fail; document if so)
- [ ] Spot-check one fresh takeaway: `cat transcripts/takeaway-$(date +%Y-%m-%d)*.md | head -30` — content should be specific to the conversation, not generic
- [ ] Spot-check one fresh aggregate: open `/rounds/{newId}/aggregate` in browser; convergence map should render with the real session
- [ ] `git status` — no test artifacts staged accidentally
- [ ] If running against deployed URL: confirm KV env vars are set on Vercel (otherwise rounds + invites are in-memory and lost on cold-start)

---

## 6. What's NOT covered (intentional)

| Out of scope | Why |
|---|---|
| Voice transcription (`/api/transcribe`) | Optional Groq integration; degrades silently if key absent. Not on critical demo path. |
| Managed Agent claim verification (`/api/sessions/[id]/research`) | Tested manually Apr 24; reachable from the session page but not part of the headline 6 journeys. Add a Journey F if it makes the video. |
| Mobile viewport rendering | Demo is desktop-only; Vercel preview is what judges see. |
| Concurrent participant load | Hackathon POC; no load target. |
| Browser back/forward across the chat | Out of scope for POC; chat is single-tab forward-only. |

---

## 7. If a judge reports a broken journey

1. Reproduce locally with `HEADLESS=0 ONLY=<letter> npx tsx scripts/verify-journeys-e2e.ts` — watch the browser.
2. Check `tmp/verify-failure-<letter>/page0.png` for the rendered DOM at failure.
3. Check the dev-server logs for the failing API call (each Claude call logs ms + token counts).
4. If the failure is on Vercel only: check `KV_REST_API_URL` is set; check `RATE_LIMIT_BYPASS_TOKEN` if running heavy testing.

Last verified clean: **2026-04-26 (Apr 26 IST evening, pre-submit)**.
