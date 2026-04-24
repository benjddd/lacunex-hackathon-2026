# Demo Recording Script — Lacunex
> For Saturday recording. Target: 2:45–3:00. Hard cap 3:00.
> Use a separate browser profile. Set display zoom to 125%. Font size legible at 720p.

---

## Pre-recording setup

- Browser: fresh profile, no extensions visible
- Tab 1: `http://localhost:3000/p/founder-product-ideation` (participant view)
- Tab 2: `http://localhost:3000/` (host / combined view — same session, different window)
- Arrange windows side-by-side (two half-screen windows, or switch tabs with narration)
- Terminal with `npm run dev` running, hidden behind
- Practise the participant responses below until they flow naturally — you're typing them

---

## Narration (voiceover, recorded separately)

### 0:00 – 0:12 | Setup

> "Lacunex runs structured interviews where the platform does the intellectual work — deciding each question from the full conversation state, surfacing what was implied but not said, and producing structured insight live, not in an overnight report."

*Screen: host view (`/`) showing the brief selector. Click "Founder Investment Evaluation", then "Start interview."*

---

### 0:12 – 0:35 | Interview opens

*Screen: participant view. The opening question appears.*

**Participant types (slowly, so it reads on screen):**
> "I'm building a tool for product teams to run structured retrospectives. We talk to early PMs and the feedback has been really strong."

*Host view: watch extraction fill — "problem: retrospectives for product teams", team signal: "early PMs"*

> "The first question adapts to what was just said. The host dashboard starts filling in real time — structured signal, not a transcript."

*Participant types:*
> "We have maybe three or four people who've tried it. They said it's useful. We're still figuring out who exactly we're building for."

*Host view: extraction shows "validation: anecdotal (3–4 users), ICP: undefined"*

> "Notice that the extraction already flags the evidence gap — not through a checklist, but from what the participant actually said."

---

### 0:35 – 1:10 | Conductor adapts + meta-notice fires

*A question arrives that probes the evidence gap — something like: "When you say the feedback has been strong — can you say more about what specific problem they described?"*

**Participant types:**
> "Honestly, it's more that they said they find retrospectives painful in general. We haven't done a super deep dive on the specific workflow yet."

*Host view: a ◆ meta-notice badge appears on the host's question. Click it.*

> "Cross-turn reasoning fired. The platform noticed that 'strong feedback' and 'haven't done a deep dive' sit in the same account — that's a structural signal, not just a fact check."

*Show the notice panel: something like "Witness described 'strong feedback' at turn 1, then concedes limited depth of validation at turn 5. These two claims sit in tension — the strength of signal claimed at the top may rest on a thinner base than stated."*

---

### 1:10 – 1:45 | Anchor return

*The conductor returns to an earlier claim. Question arrives like: "You said at the start that feedback has been really strong. You've just described it as 'they find retrospectives painful in general' — is that the same thing, or did you mean something different earlier?"*

*An amber ↩ chip appears on the host turn.*

> "Anchor return — the conductor flagged a contradiction and brought it back, in the same conversation, before it disappeared into the transcript."

**Participant types (the moment of honesty):**
> "No, you're right — strong might have been overstating it. They're interested, they have the problem, but I don't have anyone who said 'I'd pay for this tomorrow.'"

*Extraction updates: "validation: implied interest, no WTP established"*

> "That's the insight. It didn't come from a form. It came from a follow-up the platform knew to ask."

---

### 1:45 – 2:15 | Session close — bilateral artifacts

*Narrator types: "That's enough — let's close the session."*

*Click "End session" on participant side. "See your reflection →" appears.*
*Click it. Show the takeaway — especially the "what you already have that's relevant" section.*

> "The participant gets a reflective takeaway — not a summary, but something they can act on. This section names specific resources already in their life they hadn't connected to the problem."

*Switch to host view. Show the fully-filled extraction dashboard.*

> "The host has structured signal — live, during the conversation. Not two hours of transcript work later."

---

### 2:15 – 2:50 | Rounds — cohort view

*Navigate to `/rounds`. Show a round with 10+ sessions aggregated.*
*Click "View aggregate".*

> "Run the same brief across any number of participants. The platform synthesizes across sessions — convergent problems, shared assumptions, divergent framings, outliers. Patterns a stack of transcripts can't surface."

*Show one pattern block with quoted evidence.*

> "Everything the investigator needs to act, routed to the right team."

---

### 2:50 – 3:00 | Close

*Back to `/start` — show the NL generator briefly.*

> "Describe your use case in plain language — Opus 4.7 generates the brief. Founder evaluation, post-incident review, civic consultation — or yours. One brief, many participants, comparable structured signal."

*Fade on the tagline:*
**"Cross-turn reasoning, rendered live. Both sides leave with something."**

---

## Recording checklist

- [ ] Practise all typed responses twice before recording
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
