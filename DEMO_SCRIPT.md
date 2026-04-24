# Demo Recording Script — Lacunex
> For Saturday recording. Target: 2:45–3:00. Hard cap 3:00.
> Use a separate browser profile. Set display zoom to 125%. Font size legible at 720p.

---

## Pre-recording setup

**Recording approach (decided):** Record two separate screen captures — participant view and host view — as independent sessions. Edit them together in post-production. Session state is client-side per tab so they cannot share live state; the edit sells the side-by-side story.

- Browser: fresh profile, no extensions visible
- **Recording A (participant view):** `http://localhost:3000/p/founder-product-ideation` — capture just the chat pane; no badges, no dashboard
- **Recording B (host view):** same URL but with the dashboard pane in focus, or the combined split-screen — capture dashboard filling, ◆ badges, ↩ chips
- Terminal with `npm run dev` running, hidden behind
- Practise the participant responses below until they flow naturally — you're typing them for both recordings

---

## Narration (voiceover, recorded separately)

### 0:00 – 0:12 | Cold-open — real-world hook

> "In November 2025, Cloudflare's postmortem named 'unchallenged assumptions' as the root cause of a major outage. The assumption was in the conversation. Nobody noticed it across turns. That's what Lacunex builds for."

*Screen: static title card or slow zoom on the Lacunex logo. No product UI yet — the problem lands first.*

**On-screen callout (subtle, bottom-right):**
> Source: Cloudflare postmortem · 18 Nov 2025

---

### 0:12 – 0:25 | Host sets a goal

> "A Host describes their use case in plain language. Opus 4.7 generates the interview brief."

*Screen: `/start` page — NL generator open. Type a short description; watch the brief card appear. Click "Start interview."*

**On-screen callout (appears as brief card renders):**
> 5 objectives · schema-bound extraction · meta-noticing hints

---

### 0:25 – 0:45 | Interview opens

*Screen: participant view. The opening question appears.*

**Participant types (slowly, so it reads on screen):**
> "I'm building a tool for product teams to run structured retrospectives. We talk to early PMs and the feedback has been really strong."

*Host view: watch extraction fill — "problem: retrospectives for product teams", team signal: "early PMs"*

> "The first question adapts to what was just said. The host dashboard starts filling in real time — structured signal, not a transcript."

*Participant types:*
> "We have maybe three or four people who've tried it. They said it's useful. We're still figuring out who exactly we're building for."

*Host view: extraction shows "validation: anecdotal (3–4 users), ICP: undefined"*

> "Notice that the extraction already flags the evidence gap — not through a checklist, but from what the participant actually said."

**On-screen callout (during dashboard fill, appears and fades):**
> Extraction: live, not post-hoc — Haiku 4.5

---

### 0:45 – 1:20 | PEAK 1 — Conductor adapts + meta-notice fires

*A question arrives that probes the evidence gap — something like: "When you say the feedback has been strong — can you say more about what specific problem they described?"*

**Participant types:**
> "Honestly, it's more that they said they find retrospectives painful in general. We haven't done a super deep dive on the specific workflow yet."

*Host view: a ◆ meta-notice badge appears on the host's question. Click it.*

> "Cross-turn reasoning fired. The platform noticed that 'strong feedback' and 'haven't done a deep dive' sit in the same account — that's a structural signal, not just a fact check."

*Show the notice panel: something like "Witness described 'strong feedback' at turn 1, then concedes limited depth of validation at turn 5. These two claims sit in tension — the strength of signal claimed at the top may rest on a thinner base than stated."*

**On-screen callouts (hold ~3s — this is the peak):**

Overlay 1 — next to the ◆ badge as it appears:
> ◆ META-NOTICE · hedging_pattern
> anchors: turn 1, turn 5

Overlay 2 — below the host bubble, showing the observation verbatim:
> "really strong" (turn 1) ↔ "haven't done a super deep dive" (turn 5)
> Evidence softened across turns.

Overlay 3 — tiny, bottom-right, citing source of truth:
> Captured in session audit (/sessions/[id]) — exact platform output

*Note to editor: pull exact observation text from the recorded session's audit panel. Do not paraphrase. If the live take's notice text reads flat, use alternate P1 (`outside_consideration`) — see §2 alternates.*

---

### 1:20 – 1:50 | PEAK 2 — Anchor return

*The conductor returns to an earlier claim. Question arrives like: "You said at the start that feedback has been really strong. You've just described it as 'they find retrospectives painful in general' — is that the same thing, or did you mean something different earlier?"*

*An amber ↩ chip appears on the host turn.*

> "Anchor return — the conductor flagged a contradiction and brought it back, in the same conversation, before it disappeared into the transcript."

**Participant types (the moment of honesty):**
> "No, you're right — strong might have been overstating it. They're interested, they have the problem, but I don't have anyone who said 'I'd pay for this tomorrow.'"

*Extraction updates: "validation: implied interest, no WTP established"*

> "That's the insight. It didn't come from a form. It came from a follow-up the platform knew to ask."

**On-screen callouts (hold ~3s):**

Overlay 1 — next to the ↩ chip:
> ↩ ANCHOR RETURN → turn 1
> conductor.move_type: anchor_return

Overlay 2 — below the host bubble, quoting the conductor's reasoning verbatim:
> "The strength claim has softened twice.
> Surfacing before it hardens into context."

*Note to editor: pull the reasoning from the recorded session's audit panel — it's the "why this move" field on the host turn where the ↩ chip appears.*

---

### 1:50 – 2:00 | Host dashboard — fully populated

*Switch to host view. Show the fully-filled extraction dashboard — columns, not a transcript.*

> "The host has structured signal — live, during the conversation. Not two hours of transcript work later."

**On-screen callout (brief, as dashboard columns fade in):**
> 5 objectives · N turns · grounded in participant quotes

---

### 2:00 – 2:35 | PEAK 3 — Participant takeaway: what you already have

*Participant side: click "End session". "See your reflection →" appears. Click it.*
*Scroll slowly to the **"What you already have that's relevant"** section. Hold on it for ~3 seconds.*

> "The participant gets a reflective takeaway — not a summary, but something they can act on. This section names specific resources already in their life they hadn't connected to the problem. No other tool in this category offers the participant anything to keep."

**On-screen callouts (sparing — don't overload the emotional beat):**

Subtle underline animation under the section heading "What you already have that's relevant" as narration lands.

Near end of beat (tiny, non-intrusive):
> 4 Claude calls per session: conductor · meta-noticing · extraction · takeaway

---

### 2:35 – 2:50 | Rounds — cohort scale (compressed)

*Navigate briefly to `/rounds`. Show a round with 10+ sessions. Click "View aggregate". Show one pattern block with quoted evidence — don't pause.*

> "Run the same brief across any number of participants — convergent problems, shared assumptions, outliers. Comparable structured signal, not a pile of idiosyncratic transcripts."

**On-screen callout (flashes as aggregate renders):**
> AGGREGATE · 15 sessions · 10 cross-cohort patterns

---

### 2:50 – 3:00 | Close

> "Founder evaluation, post-incident review, civic consultation — or yours. One brief, many participants."

*Fade on the tagline (screen text):*
**"Cross-turn reasoning, rendered live. Both sides leave with something."**

**Sub-line (one size smaller, below tagline):**
> Opus 4.7 · Sonnet 4.6 · Haiku 4.5 · MIT-licensed · built Apr 21–26 2026

---

## Recording checklist

- [ ] **Friday evening: dry-run.** Run one full session end-to-end; verify meta-notice fires and `what_you_already_have` section is specific. Record the dry-run — keep it if it's clean.
- [ ] **Friday evening: decide tools** — screen recorder (ScreenApp or OBS), audio (headset or ElevenLabs), editing (Descript or CapCut). Don't install new tools Saturday morning.
- [ ] Practise all typed responses twice cold before first take
- [ ] Disable notifications (Focus mode)
- [ ] Record at 1920×1080, 30fps minimum
- [ ] Narration separately via line-in or good headset (no laptop mic)
- [ ] Leave 0.5s pause between major beats for editing
- [ ] Two takes minimum; keep the one where the meta-notice timing is cleanest
- [ ] Export under 100MB for upload

## Editing notes

- Trim any visible loading spinners if they're > 1s (cut to after)
- The ◆ badge and ↩ chip on-screen moments are the "wow" beats — hold on each for ~3s
- Subtitle the typed participant text if the font is small at 720p
- Keep narration pace slow — judges watch once at speed, not twice
