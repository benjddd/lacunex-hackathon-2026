# Lacunex Demo Recording Script

For the hackathon submission video. **Target: 2:30 strict.** Ceiling 2:42 if a beat lands long; do not exceed.

Source material (gitignored — local recording artefacts):
- Winning sim session: `session-2026-04-26T04-43-27-086Z` (persona `congestion_supporter_hidden_cost`, re-sim 2026-04-26 — has persisted ◆×2 + ↩×1 metadata)
- Cohort round: `round-2026-04-24T21-21-52-268Z` — 11 sessions · 303 turns · **54 ◆ deployed / 243 considered** · 12 patterns · 6 routing recommendations
- Takeaway markdown for the winning session
- Cross-cohort evidence (committed): [docs/cohort/congestion-charge-2026-04-24.md](docs/cohort/congestion-charge-2026-04-24.md)

All on-screen quotes are VERBATIM from the winning session, takeaway, primary-source news, or agent report. Do not paraphrase.

---

## Captures needed on Saturday

| Capture | Content | Tool |
|---|---|---|
| **A** — Cold open | Three quote cards (Cloudflare, UK Covid Inquiry, Hackney) animated stills + VO | post-production |
| **B** — Template pick + interview opens | `/host` → "Civic Consultation" card → click "demo · both sides" → split-screen at `/demo?brief=civic-consultation` | OBS screen capture |
| **C** — Live conductor + extraction (split-screen) | Participant chat (right) + host dashboard (left); columns rising | OBS, two windows |
| **D** — Self-shoot face for PEAK 1 | 5s of face reading screen, micro-"huh" reaction | phone rear camera, books-stack tripod |
| **E** — Anchor return + column mutation | ↩ chip on host turn 8, dashboard column mutates in place | OBS screen capture |
| **F** — Letter takeaway | Chat dissolves to letter view; `what surfaced` pull-quote | OBS screen capture |
| **G** — Convergence map | `/rounds/.../aggregate` — force-directed map, cluster halos fade in, hover-highlight pattern | OBS screen capture |
| **H** — Brief-designer reveal | Cut back to `/host`, hover across template grid | OBS screen capture |
| **I** — Held takeaway sentence + URL card | Static design cards | post-production |

**Recording order Saturday:** D first (self-shoot — separate pose, separate setup), then B → C → E → F → G → H in one or two browser sessions. A and I are post-production only.

---

## 0:00–0:20 | Triple-pain cold open — Capture A (20s)

**Visual:** three quote cards fade in sequentially, each with chyron domain label.

**On-screen quote 1 (0:00–0:06):**
> ENGINEERING — Cloudflare incident postmortem · 18 Nov 2025
>
> *"unchallenged assumptions"*

**On-screen quote 2 (0:06–0:11):**
> PUBLIC HEALTH — UK Covid-19 Inquiry, Module 1 · Jul 2024
>
> *"'groupthink' undermined the effectiveness of their advice"*

**On-screen quote 3 (0:11–0:15):**
> CIVIC — Hackney consultation quashed in High Court · Nov 2024
>
> *"failing to provide consultees with sufficient information to make an intelligent response"*

**Voiceover (0:15–0:20, over fade-to-black between final quote and demo cut):**
> "Three failures. Three domains. One pattern — the signal was there, no one probed it. Postmortems find these in months. We built something that finds them in hours."

---

## 0:20–0:33 | Pick preset + interview opens — Capture B (13s)

**Visual:** `/host` page. Cursor moves across template grid; hovers over the **"Civic Consultation"** card; cursor flashes briefly on the **"invite link"** button (which copies an `/i/<token>` URL — capture this 1s flash for narrative truth, then cut). Cut to `/demo?brief=civic-consultation` (split-screen with both sides) — this is what we'll record from for Captures C/E/F because it shows participant chat and host dashboard in the same window. Opening question appears. Extraction columns begin to materialise on the host dashboard.

**Voiceover:**
> "Pick a template. Share the link. The interview's running."

> **Recording note:** the production path is `/host` → click "invite link" → host shares the `/i/<token>` URL → participant opens it → redirects through invite redemption → lands on `/p/civic-consultation`. For the demo we shortcut to `/demo?brief=civic-consultation` (split-screen) because both sides are needed in one frame. The 1-second flash on the "invite link" button preserves narrative truth without the full token-redemption flow.

---

## 0:33–0:53 | Conductor named + extraction visible — Capture C (20s)

**Visual:** sustained split-screen. Right pane: participant chat with adaptive follow-ups landing. Left pane: extraction columns `lived_experience`, `priorities_and_trade_offs`, `trust_and_process`, `barriers_and_access`, `adjacent_concerns` rising in completeness.

**Participant types (mirror sim turns 1, 3, 5):**

**Turn 1:**
> I think it's broadly the right direction, honestly — we need to do something about the air quality and how car-dependent everything's become.

**Turn 3:**
> Well, my mum-in-law has hospital appointments near the old market square — she can't manage the bus. Last Tuesday, five minutes out, I found myself checking my phone at a red light to see whether the charge had started yet. It hadn't. But I noticed the stress.

**Turn 5:**
> I moved my Wednesday physio to a practice further out. There's a pharmacy I've used for years right in the middle of the zone — I went to the Boots near the ring road instead.

**Voiceover (over the live conductor's adaptive follow-ups):**
> "Every question is the platform's live decision — probe, switch, surface a notice, anchor back, or wrap. Five move-types, chosen turn by turn. Extraction fills as it runs — not after the session. During."

---

## 0:53–1:14 | PEAK 1 — ◆ meta-notice + held two-shot — Captures C + D (21s)

**This is the climax. Music drops to silence for 8 seconds across the badge frame.**

**Visual sequence:**
1. (0:53–0:56) ◆ badge appears on host turn 4. Click badge.
2. (0:56–1:04) **Two-shot held silent** — split: participant face from Capture D on the left (5s loop, slowed to 8s with subtle slow-motion); on the right, the ◆ notice panel with the earlier-turn quote pulled out:
   > ◆ META-NOTICE · contradiction
   > anchors: turn 1 · turn 3
   >
   > *"The participant initially presents the mode switch as a straightforward preference for predictability, but on closer telling it's a 30-minute net time penalty they only accepted because of the anticipated charge. The 'easier' framing appears to be post-hoc rationalisation."*

   **Music: muted. No VO. Hold.**
3. (1:04–1:14) Music returns at –24 dB. VO resumes.

**Voiceover (1:04–1:14):**
> "Cross-turn reasoning. The platform noticed that 'the bus is easier and more predictable' from turn 1 doesn't hold up against 'I wouldn't have switched if the charge weren't coming' from turn 3 — and a thirty-minute net time penalty. A careful reviewer might catch this on a second read. The platform caught it in time to probe."

---

## 1:14–1:34 | PEAK 2 — ↩ anchor return + column mutation — Capture E (20s)

**Visual:** ↩ amber chip appears on host turn 6 pointing back to turn 3. Dashboard extraction column for `lived_experience` visibly mutates as the new admission lands: the row that recorded "meets Sarah for coffee in the centre most weeks" updates to "spontaneous trips become planned, planned trips happen less — twice last month vs four or five before."

**On-screen overlay (VERBATIM from sim transcript turn 6):**
> ↩ ANCHOR RETURN → turn 3
>
> *"Coming back to something you mentioned a couple of turns ago — meeting Sarah for coffee in the centre most weeks, and how that's become 'a thing' you have to plan now. What's actually changed about those visits?"*

**Participant reply (turn 7) lands on screen:**
> *"spontaneous trips have become planned trips, and planned trips feel like more effort, so they happen less"*

**Voiceover:**
> "Anchor return. The conductor brought back the Sarah-coffee thread from earlier, in the same conversation. The resident's framing updates the column — not a new row, the same row, corrected."

---

## 1:34–1:54 | PEAK 3 — Letter takeaway — Capture F (20s)

**Visual:** participant clicks **"See your reflection →"**. Surface transitions: chat is replaced by a letter-style reflection (no modal). Centred 620px column, Instrument Serif headline "Thank you for the conversation." Scroll to **"What surfaced between the lines"** section. Hold.

**On-screen pull-quote (VERBATIM from generated takeaway):**
> **What surfaced between the lines**
>
> *"You described the bus as 'easier' and 'more predictable' — and then, when pressed, said the honest version is that it isn't easier, it's just what you've decided to do because you believe the charge is coming. You used the phrase 'mental gymnastics' yourself."*

**Voiceover:**
> "The resident leaves with what this conversation surfaced that he hadn't named himself. Not a summary of what he said. Something he knows now that he didn't when he walked in."

---

## 1:54–2:14 | Convergence map + leverage number — Capture G (20s)

**Visual:** transition to `/rounds/2026-04-24T21-21-52-268Z/aggregate`. Hero loads — force-directed nodes settle, soft-blurred cluster halos fade in, cluster labels appear in italic serif. Hover-highlight a pattern on the left rail to light up its supporting sessions in the map.

> **Cluster-label note:** the live labels render from `aggregate.patterns[].summary` and read longer than the stylised phrases (e.g. *"preemptive adaptation before policy is live"*, *"dependents as the unvoiced pressure point"*, *"self-censorship to avoid being miscategorised as anti-progress"*). For a cleaner demo frame, either (a) capture the live labels as-is — they're authentic and substantive, or (b) mask the longer labels in post with abbreviated overlays *"Stated support, lived workaround"* / *"Trust in process"* if the live ones don't fit the frame. Decide at edit time, not record time.

**On-screen chyron (bottom-right, 1:58–2:14):**
> 54 ◆ deployed · 243 considered

**Voiceover:**
> "Run that brief across a cohort, the same engine finds patterns ACROSS conversations. Eleven residents. Twelve patterns. Six routing recommendations. Fifty-four cross-turn fires across two hundred forty-three candidates considered — choosier than a human reviewer."

---

## 2:14–2:24 | Brief-designer reveal — Capture H (10s)

**Visual:** cut back to `/host`. Cursor flashes through the template grid — "Civic Consultation" highlights briefly, then the cursor lands on "Brief Designer" card. Hold for 1s.

**Voiceover:**
> "Did you wonder how the civic-consultation brief was authored? The platform interviewed the host. Same conductor. Same cross-turn reasoning. If none of these presets fit your investigation — design your own, by being interviewed."

---

## 2:24–2:28 | Held participant takeaway sentence — Capture I (4s)

**Visual:** clean white card. Centred. Single sentence rendered in Instrument Serif, 36pt:

> *"The survey is asking me to declare myself; this conversation is asking me to think."*

**Audio: music bed only. NO voiceover. Music begins fade-out at 2:26.**

---

## 2:28–2:30 | URL + attribution card — Capture I (2s)

**Visual:** clean card.

> **lacunex.com**
>
> Built in five days · Opus 4.7 · MIT-licensed

**Audio: music tail completes fade-out by 2:30.**

---

# Recording Plan

## Pre-recording (dry-run)

1. Close all notifications, focus mode on
2. Browser: fresh profile, 125% zoom, 1920×1080 window
3. Terminal open with `npm run dev` running (hidden behind)
4. Practice the participant turn 1/3/5/7/9 responses until they flow without hesitation
5. Dry-run full flow once — confirm:
   - Template-pick → invite generation → participant view loads
   - ◆ meta-notice fires on or around turn 7-8 (use the persisted winning sim if a fresh fire misses)
   - ↩ anchor-return fires on turn 8
   - Letter takeaway renders with `what_surfaced` section populated
   - Convergence map at `/rounds/2026-04-24T21-21-52-268Z/aggregate` shows cluster halos + labels

## Capture order (in sequence)

**FIRST: Capture D — Self-shoot face.**
- Phone (rear camera) on a books-stack tripod, eye height
- 80–110cm distance, 30–45° window light from front
- A4 paper on desk for fill
- Sticky note over lens area of eye-line — DO NOT look at lens, only at laptop screen
- 12–15 takes in bursts of 3, review between bursts
- The 5 seconds: neutral reading face → micro-pause → eyebrows up → 2cm head tilt back → quietest possible "huh" → hold
- Audio: not used. Mute clip in edit.
- Use take 8–11.

**Capture A — Cold open (post-production, voiceover + design cards).**
- VO recorded separately (line-in or good headset; or Descript)
- Source images: Cloudflare 18 Nov 2025 postmortem screenshot, UK Covid-19 Inquiry Module 1 cover, Hackney 2024 court coverage screenshot. Cite source + date in chyron.

**Capture B — Template pick + interview open (screen capture).**
- Open `/host`, hover across templates over the "Civic Consultation" card
- Briefly hover the "invite link" button to show the production path exists (1s)
- Click "demo · both sides" → opens `/demo?brief=civic-consultation` (split-screen)
- Capture B ends as the demo page loads with the opening question rendered
- 2 takes; pick cleanest cursor movement

**Capture C — Civic-consultation interview (split-screen).**
- Recording: `/demo?brief=civic-consultation` — single window, both sides visible (participant chat + host dashboard in split-screen). No need to coordinate two browser windows.
- Recording B: host live dashboard view (`/host/live/{sessionId}`)
- Run both simultaneously on two windows OR record independently in two takes and edit-combine
- Participant types scripted turn 1/3/5/7/9 responses
- Continue until session closes; transitions to letter-style reflection automatically — capture this transition for Capture F too
- 2-3 takes; pick cleanest ◆ + ↩ timing

**Capture E — Anchor return + column mutation (screen capture, may be subset of C).**
- If C didn't capture the column mutation cleanly, re-cut from C take #2 with a slight zoom on the dashboard column animation

**Capture F — Letter takeaway (subset of C).**
- The transition to the letter view is part of Capture C; isolate it for the PEAK 3 beat

**Capture G — Convergence map (screen capture).**
- Navigate to `/rounds/2026-04-24T21-21-52-268Z/aggregate`
- Wait ~1s for layout to settle (force-directed converges fast on 11 nodes)
- Hover over the strongest pattern on the left rail to light up its sessions
- 1 take

**Capture H — Brief-designer reveal (screen capture).**
- Cut back to `/host`, cursor flashes through template grid, lands on "Brief Designer"
- 1 take

**Capture I — Final cards (post-production).**
- Held takeaway sentence card
- URL + attribution card

---

# Music + audio plan

**Bed:** Scott Buckley — *Borealis* (CC-BY 4.0). Backup: *She Moved Mountains*. Both downloaded to `tmp/music-samples/`. Audition over the recorded VO before locking; whichever still works with the bed muted for 8 seconds is the right pick.

**Mix levels:**
- Music bed: –22 to –26 LUFS
- VO: –16 LUFS
- Ducking: –12 dB attenuation when VO present, 300ms attack/release

**Silence drop:** at PEAK 1, manually delete the music clip across 0:56–1:04 (8 seconds). 200ms fade-out before, 200ms fade-in after. The silence under the held two-shot is non-negotiable — it is the climax beat.

**Music fade-out:** begins at 2:26 (during held takeaway sentence), completes by 2:30 (end of URL card).

**YouTube description attribution (paste verbatim):**
```
Music: 'Borealis' by Scott Buckley — released under CC-BY 4.0.
www.scottbuckley.com.au
```

---

# Editing notes

- Hold ~3s on each PEAK overlay — they are the memory-making moments
- ↩ chip at 1:14–1:34 and column mutation are critical frames — if the mutation reads subtle, add a soft highlight animation in post
- `what_surfaced` section at 1:34–1:54 must be readable at 720p — caption-burn if the font reads small
- Convergence map at 1:54–2:14 — let cluster halos visibly fade in; that is the cinematic moment
- Narration pace: SLOW. Judges watch once at speed.
- Captions: burn-in for the entire video. Style 36–44pt white text, black 70%-opacity background, bottom-third anchor.
- Target export: 1080p30 H.264 MP4, under 100MB

---

# Pre-submit checklist

- [ ] Total runtime ≤ 2:30 (verify in media player, not memory)
- [ ] Self-shoot clip muted in edit
- [ ] PEAK 1 silence drop verified (8s, –200ms/+200ms fades)
- [ ] All on-screen quotes match verbatim — winning session, takeaway, primary-source news
- [ ] Cohort numbers match: 11 sessions, 303 turns, 54 ◆ deployed, 243 considered, 12 patterns, 6 recommendations
- [ ] Cold-open quote attributions correct: Cloudflare 18 Nov 2025, UK Covid-19 Inquiry Module 1 Jul 2024, Hackney Nov 2024
- [ ] Held takeaway sentence on screen at 2:24–2:28 with no VO
- [ ] URL + attribution card legible at 720p
- [ ] Captions burned-in, product names spelled correctly ("Lacunex", "Opus 4.7", "Anthropic")
- [ ] Music attribution line in YouTube description
- [ ] Audio: VO clear at 1.25× playback; no clipping; music ducks correctly
- [ ] Played back once on phone in mobile data conditions (lowest YouTube bitrate)
- [ ] Played back once on laptop with sound off — story still readable from captions + visuals alone
