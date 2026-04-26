# Calendar & Gates — Built with Opus 4.7 hackathon (Anthropic)

All times **IST**. Every session: read this file, act on imminent gates.

**Submission deadline: Mon 2026-04-27 03:00 IST.**

---

## Milestones (chronological)

### Wed 2026-04-22 (today)
- **EOD gate (22:00 IST):** Next.js scaffold + Anthropic SDK wired + Founder template in repo + conductor loop running text-only on hand-typed turns + split-screen UI skeleton + extraction visible in dashboard. If we don't have end-to-end loop running, stop; debug before bed, don't start new features.

### Thu 2026-04-23
- **08:00–09:00 IST:** README and submission Field 5 review pass — confirm USP framing reads as positioning, not comparison.
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
- **Day:** Demo script redesigned to strict 2:30 (was 2:55). Triple-pain cold open (Cloudflare 18 Nov 2025 + UK Covid Inquiry Module 1 + Hackney 2024). MOVES 1–5 locked: self-shoot face on PEAK 1, 8s music silence drop on the badge frame, combined silent close (held participant takeaway sentence + URL/attribution card), one on-screen number `54 ◆ / 243 considered`. Brief-designer moved to end as rhetorical loop-back. Managed Agent dropped from video, lives in submission Field 6 only.
- **Music:** Borealis (Scott Buckley, CC-BY 4.0) locked. Backup She Moved Mountains. Both in `tmp/music-samples/`.
- **EOD (22:00 IST):** Recording deferred to Sunday morning. Raw materials prep optional tonight: dry-run the demo flow, build cold-open / takeaway / URL Figma overlays, draft YouTube unlisted upload metadata. Skip if tired — none are gates.

### Sun 2026-04-26 — RECORDING + EDIT DAY

Working window: ~10h before T-3h gate. Budget shows ~5h of actual work + ~6h slack.

- **08:30 IST:** Coffee. Cold read [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Flag any drift between script and current app behavior.
- **09:00 IST:** Dry-run the full demo flow on `npm run dev`. Confirm `/host` template-pick → invite → `/p/...` → ◆ fires → ↩ fires → letter renders → `/rounds/2026-04-24T21-21-52-268Z/aggregate` map loads.
- **09:30 IST:** **Capture D — self-shoot face for PEAK 1 (25 min).** Phone rear camera, books-stack tripod, sticky note over lens area. 12–15 takes in bursts of 3, use take 8–11. Audio not used. **Plan B if unusable after 30 min:** full-screen UI zoom on badge with VO line "wait — it caught that".
- **10:00 IST:** **VO recording (20 min).** One WAV per beat (`vo-01.wav`–`vo-10.wav`), 48kHz mono. Beat 9 has no VO.
- **10:30 IST:** **Captures B/C — interview flow (30 min).** Two windows OR two takes for split-screen. Participant types scripted turns 1/3/5/7/9. 2–3 takes; pick cleanest ◆ + ↩ timing.
- **11:00 IST:** **Captures E/F (subset of C, 5 min)** + **Capture G — convergence map (5 min)** + **Capture H — brief-designer reveal (5 min).**
- **11:30 IST:** Break.
- **12:00 IST:** **Descript edit (60–75 min).** Pipeline in [INTERNAL_VIDEO.md §14](INTERNAL_VIDEO.md). Critical: **PEAK 1 silence drop** — split music clip at 0:56 and 1:04, delete middle 8s, 200ms fades each side.
- **13:00 IST:** **v1 export** (1080p H.264 MP4, captions burned in) → YouTube unlisted upload. Wait 10–20 min for HD processing.
- **13:30 IST:** **v1 live QA.** Phone with sound off (captions readable?), laptop incognito with sound on (VO clear over Borealis?). List ≤5 fixes.
- **14:00 IST:** Lunch + decompress.
- **15:00 IST:** **v2 polish + re-export.** Apply only the ≤5 fixes; no new beats.
- **16:00 IST (T-11h gate):** **Submission form filled, URL pasted, save-as-draft.** Better an OK draft saved at T-11h than a perfect cut not yet submitted at T-1h.
- **16:00–20:00 IST:** Slack window. v3 polish if v2 surfaced anything; otherwise rest.
- **20:00 IST (T-7h):** Final cut (≤ 2:30) confirmed. README + 100–200-word written summary final. Repo clean.
- **Mon 2026-04-27 00:00 IST (T-3h):** Submitting by 02:00 IST, not 02:55.
- **Mon 2026-04-27 02:00 IST (T-1h):** Submit now.

**Risk flags during recording day:**
- If live ◆ doesn't fire cleanly on a fresh interview run, use the verified winning sim session `session-2026-04-24T20-59-09-733Z` directly. Don't sink an hour coaxing a fresh fire.
- If Borealis fights the VO once heard together, ping with timestamp + symptom; backup pool downloadable in 5 min.
- Sunday afternoon support windows for Vercel/YouTube unknown — solo-debugging risk. Mitigation: T-11h draft-submit discipline above.

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
