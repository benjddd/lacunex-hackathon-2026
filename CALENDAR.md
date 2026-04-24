# Calendar & Gates — Built with Opus 4.7 hackathon (Anthropic)

All times **IST**. Every session: read this file, act on imminent gates.

**Submission deadline: Mon 2026-04-27 03:00 IST.**

---

## Milestones (chronological)

### Wed 2026-04-22 (today)
- **EOD gate (22:00 IST):** Next.js scaffold + Anthropic SDK wired + Founder template in repo + conductor loop running text-only on hand-typed turns + split-screen UI skeleton + extraction visible in dashboard. If we don't have end-to-end loop running, stop; debug before bed, don't start new features.

### Thu 2026-04-23
- **08:00–09:00 IST:** **60-min competitor scan** — Outset.ai, Listen Labs, Wondering, Versive. Confirm specific moat lines that survive honest comparison. Rewrite anti-positioning in README/summary against what actually differentiates.
- **09:00–18:00 IST:** **Meta-noticing ONLY.** No other features. Iterate prompt against synthetic-adversary runs (`npm run sim` with unfocused_founder, evasive_pm, overconfident_researcher personas). Kill rule: a notice only counts if it cites ≥2 turn indices AND would not fire on either turn in isolation.
- **17:30 IST:** Open Anthropic live stream for Managed Agents talk.
- **18:00 IST:** Watch Michael Cohen Managed Agents talk. Notes on (a) concrete 3-hour implementation path, (b) auth/access/setup friction, (c) realistic scope for post-session research agent.
- **22:00 IST — Thu close gate:**
  - Meta-noticing gate: if no genuinely surprising notice has emerged on a real transcript, **cut meta-noticing from the demo's peak beats** and re-anchor on dashboard + takeaway. Do not ship a canned peak.
  - **Managed Agents go/no-go** (moved earlier from Fri 20:00): default no; flip to yes only if the Cohen talk revealed a concrete 3-hour path.
  - Demo subject decided (and participant notified if it's someone else).

### Fri 2026-04-24
- **Voice: shipped (D23 reversed).** Groq Whisper large-v3 via `/api/transcribe`; mic button in ChatPane. Falls back silently when `GROQ_API_KEY` is unset.
- **Managed Agents: wired** (D40, D45). One genuine Claude Managed Agent shipped: the post-session claim verifier (beta.agents + beta.environments + beta.sessions, web_search tool, SSE event stream rendered live in the session page). Earlier dual-agent framing (also calling cohort synthesis an "agent") was walked back on 2026-04-24 — synthesis is a useful feature but is a single Messages-API call, not a Managed Agent.
- **Post-Incident and Civic Consultation briefs: done.** Three fully functional briefs live.
- **Morning:** Polish pass — terminology cleanup (internal terms still visible in UI), any Vercel deploy blockers.
- **18:00 IST:** Vercel deploy + smoke-test. Upstash KV credentials must be set in Vercel env vars before this.
- **EOD gate (22:00 IST):** Deployed, working, all three briefs pristine on Vercel. README judge-readable. **If anything is half-wired, cut it now — a flawless core beats a broken stretch.**

### Sat 2026-04-25
- **10:00 IST:** Start recording demo interview. Confirm demo subject before first take. Participant should NOT see the questions in advance.
- **EOD gate (22:00 IST):** ~2 min of raw interview footage captured (≥3 takes). Rough cut drafted. **Video length tracked — 3:00 is the hard cap for submission.** Pitch framing finalized.

### Sun 2026-04-26
- **20:00 IST (T-7h):** Final video cut (≤ 3:00). **Written summary polished to 100–200 words.** README clean. GitHub repo clean.
- **Mon 2026-04-27 00:00 IST (T-3h):** Be submitting by 02:00 IST, not 02:55.
- **Mon 2026-04-27 02:00 IST (T-1h):** Submit now.

### Mon 2026-04-27
- **03:00 IST (= Sun 20:00 EST):** Deadline.
- Rest of day: **Stage 1 judging** (async). Judges score every submission against weighted criteria; top 6 advance.

### Tue 2026-04-28
- **19:00 IST (= 12:00 EST):** **Stage 2 live round.** Top-6 **pre-recorded** demos played; judges deliberate. *There is no live demo — our 3-min recorded video is what gets played.*
- **20:45 IST (= 13:45 EST):** Top 3 + special-prize winners announced + closing.

---

## Standing instructions for AI assistants in this repo

1. Always read this file at session start. Identify the next upcoming gate.
2. If we're within 4 hours of a gate, surface it to the user in your first response.
3. If a gate has **slipped**, mark it with ⚠️ here and adjust downstream gates visibly.
4. Never silently move a milestone. If scope can't hit a gate, flag it and ask the user.
