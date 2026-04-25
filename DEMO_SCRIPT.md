# Lacunex Demo Recording Script

For the 3-min hackathon submission video. Target length **2:45** (hard cap 3:00).

Source material (gitignored — local recording artefacts):
- Winning sim session: `session-2026-04-24T20-59-09-733Z` (persona `congestion_supporter_hidden_cost`)
- Takeaway markdown for that session
- Managed Agent claim-verifier report for that session

Cross-cohort evidence (committed): [docs/cohort/congestion-charge-2026-04-24.md](docs/cohort/congestion-charge-2026-04-24.md)

All on-screen quotes are VERBATIM from the winning session, takeaway, or agent report. Do not paraphrase.

---

## Captures needed on Sat

- **Capture A** — Cold open + pivot (animated headline stills + VO, no product UI)
- **Capture B** — Brief-designer session (Host typing into `/start`; platform interviews Host)
- **Capture C** — Civic-consultation interview (split-screen: participant chat + host dashboard, then letter takeaway)
- **Capture D** — Managed Agent claim verification (post-session, host clicks "Verify claims"; live SSE event stream)
- **Capture F** — Convergence map (`/rounds/<roundId>/aggregate`) loading with the 11-session cohort
- **Capture E** — Close tagline card (post-production)

---

## 0:00–0:14 | Cold open — Capture A

**Visual:** Cloudflare postmortem pull-quote fades in; Grenfell Inquiry Phase 2 pull-quote fades in beside/below it.

**On-screen quotes (verbatim):**
> "unchallenged assumptions"
> — Cloudflare incident postmortem · 18 Nov 2025

> "decades of failure… to act on the information available to them"
> — Grenfell Tower Inquiry Phase 2 · 4 Sept 2024

**Voiceover:**
> "In November 2025, Cloudflare's postmortem named 'unchallenged assumptions' as a root cause. A year earlier, the Grenfell inquiry described 'decades of failure to act on the information available to them.' Same pattern. Different scale."

---

## 0:14–0:19 | Honest pivot — Capture A

**Visual:** simple text card on black.

**Voiceover:**
> "Postmortems find these patterns months later. Lacunex runs the same conversations in parallel — hours, not months."

---

## 0:19–0:36 | Brief-designer on camera — Capture B

**Visual:** `/start` page. Click "Design your brief" (violet card). Platform's opening question appears. Host types each response below in turn. Brief card materialises at end.

**Scripted Host responses (type live during recording):**

**Response 1:**
> I'm running a consultation for our borough council — congestion charge proposal going to committee in eight weeks. I want to understand how residents actually live with the existing traffic, and what would change their view. Our last consultation had a 4% response rate.

**Response 2:**
> Small shop owners, school-run parents, people caring for elderly relatives. Not the people who already turn up to town halls. I want residents talking about their Tuesday, not their opinion.

**Response 3:**
> Stated support and lived impact will diverge — supporters may have workarounds they haven't named, opponents may care about air quality more than they let on.

**Voiceover (over the above):**
> "Watch the platform design the brief by interviewing the Host. Same conductor, same cross-turn reasoning. The brief that's about to run is being built right now."

**On-screen callout at end:**
> brief authored · 5 objectives · extraction schema · meta-noticing hints

---

## 0:36–0:49 | Interview opens + extraction fills — Capture C

**Visual:** split-screen. Participant chat (right) starts. Host dashboard (left) begins filling — `lived_experience`, `priorities_and_trade_offs`, `trust_and_process`, `barriers_and_access`, `adjacent_concerns` columns appear with rising completeness bars.

**Participant types (live — mirror sim content, turns 1, 3, 5):**

**Turn 1:**
> I think it's broadly the right direction, honestly — we need to do something about the air quality and how car-dependent everything's become. I first heard about it maybe six months ago through a local news piece, and then it kept coming up on the community Facebook groups.

**Turn 3:**
> Well, my mum-in-law has hospital appointments near the old market square — she can't manage the bus. Last Tuesday, five minutes out, I found myself checking my phone at a red light to see whether the charge had started yet. It hadn't. But I noticed the stress.

**Turn 5:**
> I moved my Wednesday physio to a practice further out. There's a pharmacy I've used for years right in the middle of the zone — I went to the Boots near the ring road instead. I told myself it was about easier parking. But I wouldn't have done that six months ago.

**Voiceover:**
> "The brief now runs with a resident. Extraction fills turn-by-turn — not after the session, during it."

---

## 0:49–1:19 | PEAK 1 — ◆ meta-notice — Capture C

**Visual:** ◆ badge appears on a host turn (turn 7 or 8). Click badge. Notice panel opens.

**On-screen overlay (verbatim from eval-noticing on winning session):**

> ◆ META-NOTICE · contradiction
> anchors: turn 1 · turn 7 · turn 9
>
> "The initial framing of the situation as 'fine' collapses once the specific adaptations are listed — the workarounds are the real signal, and the participant eventually acknowledges this himself."

**Voiceover:**
> "Cross-turn reasoning fired. The platform noticed that 'broadly supportive, just something to sort out' from turn 1 doesn't hold up against the physio move, the pharmacy switch, the restaurant he didn't push for. A careful reviewer might catch this on a second read. The platform caught it in time to probe."

---

## 1:19–1:44 | PEAK 2 — ↩ anchor-return + column mutation — Capture C

**Visual:** ↩ amber chip appears on host turn 8 pointing back to turn 1. Dashboard extraction column visibly mutates: `lived_cost_assessment: "fine — just to sort out"` → `"already absorbing friction without the benefit yet"`.

**On-screen overlay (VERBATIM from sim transcript turn 8):**

> ↩ ANCHOR RETURN → turn 1
>
> *"Earlier you described this as basically fine, just something to sort out — but hearing the physio move, the pharmacy switch, the restaurant you didn't push for, does 'fine' still feel like the right word?"*

**Participant reply lands on screen (turn 9):**
> "saying it's fine feels like I'm not being honest about what's actually going on"

**Voiceover:**
> "Anchor return. The conductor brought back the earlier claim, in the same conversation. The resident's softened position updates the extraction column — not a new row, the same row, corrected."

---

## 1:44–2:04 | PEAK 3 — Letter takeaway — Capture C

**Visual:** participant clicks "End session". Surface transitions: chat is replaced by the letter-style reflection (no modal). Centred 620px column, Instrument Serif headline "Thank you for the conversation." Scroll to **"What surfaced between the lines"** section. Hold.

**On-screen pull-quote (VERBATIM from generated takeaway):**

> **What surfaced between the lines**
>
> *"Early on you said it was basically fine — just something to sort out. By the middle of the conversation you'd listed enough quiet rearrangements that 'fine' stopped fitting, and you said so yourself."*

**Voiceover:**
> "The resident leaves with what this conversation surfaced that he hadn't named himself. Not a summary of what he said. Something he knows now that he didn't when he walked in."

---

## 2:04–2:21 | Managed Agent — claim verification — Capture D

**Visual:** post-session view. Host clicks "Verify claims." Live SSE event stream renders:

- `▸ tool_use: web_search { query: "Stockholm congestion charge traffic reduction percentage" }`
- `▸ tool_use: web_search { query: "UK clean air zone daily charge car" }`
- `▸ tool_use: web_search { query: "UK clean air zone medical mobility exemption" }`
- `▸ tool_result` × 3 (snippets collapse in)
- Final verdict card

**On-screen final card (VERBATIM from agent report):**

> **Stockholm 22% traffic reduction** · Verdict: Supported (ITF/OECD, Tools of Change)
> **£50 charge for cars** · Verdict: Partially supported — £50 applies to HGVs, not cars (GOV.UK)
> **Scheme has no mobility exemption** · Verdict: Refuted — Birmingham and Bristol CAZs publish medical exemptions

**Voiceover:**
> "Post-session, a Managed Agent fact-checks against the live web. It verifies what the resident got right — Stockholm's figure holds — and flags what he had wrong. His real frustration wasn't about the charge. It was about the conversations the council never had with him."

---

## 2:21–2:36 | Convergence map — cohort scale — Capture F (NEW)

**Visual:** transition to `/rounds/2026-04-24T21-21-52-268Z/aggregate`. Hero loads — force-directed nodes settle, soft-blurred cluster halos fade in, cluster labels appear in italic serif ("Stated support, lived workaround" in red, "Trust in process" in ink, single outlier #07 floating top-right). Hover-highlight a pattern on the left rail to light up its supporting sessions in the map (red).

**On-screen callout (subtle, bottom-left or bottom-right):**
> convergence map · 11 sessions · 54 cross-turn fires · cohort signal 0.85–0.95

**Voiceover:**
> "And once the brief runs across a cohort, the same engine finds the patterns ACROSS conversations. Eleven residents. Twelve patterns. Six routing recommendations. Aggregate growing while the interviews ran."

---

## 2:36–2:45 | Close — Capture E

**Visual:** fade to tagline card.

**Voiceover:**
> "The brief that just ran — the platform authored it the same way it ran it. Cross-turn reasoning, all the way down. Both sides leave with something they didn't walk in with."

**Final card:**
> **Cross-turn reasoning, rendered live.**
> **Both sides leave with something they didn't walk in with.**
>
> Opus 4.7 · Sonnet 4.6 · Haiku 4.5 · Managed Agents
> MIT-licensed · built Apr 21–26 2026
> lacunex.com

---

# Saturday Recording Plan

## Pre-recording (Fri evening dry-run)

1. Close all notifications, focus mode on
2. Browser: fresh profile, 125% zoom, 1920×1080 window
3. Terminal open with `npm run dev` running (hidden behind)
4. Practice the Host brief-designer responses (three) and participant responses (turns 1/3/5/7/9) until they flow without hesitation
5. Dry-run full flow once — confirm:
   - Brief-designer flow completes cleanly
   - ◆ meta-notice fires on or around turn 7-8
   - ↩ anchor-return fires on turn 8
   - Letter takeaway renders with `what_surfaced` section populated, thread pip visible
   - Managed Agent event stream renders live (takes ~45s)
   - Convergence map at `/rounds/<round>/aggregate` shows cluster halos + labels

## Capture order (Sat morning)

**Capture A — Cold open & pivot (voiceover + images, post-production).**
- VO recorded separately (line-in or good headset; or Descript)
- Source images: Cloudflare Nov 2025 incident report cover, Grenfell Phase 2 report cover (cite in chyron)

**Capture B — Brief-designer (screen capture).**
- Recording: participant view of the brief-designer — clean, no browser chrome
- Open `/start`, click the violet "Design your brief" card
- Type the three scripted responses with natural pacing (5–8s between each)
- Wait for brief card to materialise; hold for 2s
- 2 takes minimum; pick cleanest

**Capture C — Civic-consultation interview (split-screen, two recordings).**
- Recording A: participant view (`/p/civic-consultation` or generated brief URL from Capture B)
- Recording B: host live dashboard view (`/host/live/{sessionId}`)
- Run both simultaneously on two windows OR record independently in two takes and edit-combine
- Host types Host opening + adaptive follow-ups (platform generates; no scripting needed)
- Participant types the scripted turn 1/3/5/7/9 responses
- Continue until session closes; **transitions to letter-style reflection automatically** — capture this transition
- 2-3 takes; pick the take with cleanest ◆ + ↩ timing

**Capture D — Managed Agent (screen capture).**
- On the winning-take session, navigate to `/sessions/{sessionId}`
- Click "Verify claims"
- Record SSE event log rendering live for ~45 seconds (full run)
- Final report card fills in
- 1 take (don't re-run unnecessarily — costs API)

**Capture F — Convergence map (screen capture).**
- Navigate to `/rounds/2026-04-24T21-21-52-268Z/aggregate` (or whatever round id is current)
- Wait ~1s for layout to settle (force-directed converges fast on 11 nodes)
- Hover over the strongest pattern on the left rail to light up its sessions
- 1 take

**Capture E — Close (post-production card).**
- Static tagline card

## Editing notes

- Hold ~3s on each PEAK overlay — they're the memory-making moments
- ↩ chip at 1:19-1:44 and column mutation are the single most important frames — if subtle, add a highlight animation in post
- `what_surfaced` section at 1:44-2:04 must be readable at 720p — subtitle if needed
- Managed Agent event log at 2:04-2:21 — trim any waiting time between tool calls; preserve the reading moments
- Convergence map at 2:21-2:36 — let the cluster halos visibly fade in; that's the cinematic moment
- Narration pace: SLOW. Judges watch once at speed.
- Target export: under 100MB, 1080p30, H.264

## Checklist before submit

- [ ] Full video under 2:50 (30s safety margin below 3:00 cap)
- [ ] Every on-screen quote matches verbatim the winning session / takeaway / agent report
- [ ] All Claude model names visible in final card
- [ ] MIT + build-dates on final card
- [ ] Tagline legible for ≥3s
- [ ] Audio mixed: narration clear, no clipping
- [ ] Test play on an unconnected laptop at 720p; confirm every overlay readable
