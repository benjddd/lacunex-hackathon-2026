# Descript Handover — Lacunex Demo

Companion to [DEMO_SCRIPT.md](DEMO_SCRIPT.md). The script is the source of truth for VO + on-screen narrative; **this file is the editor's checklist** — what to drag where, layer behavior, music drops, captions, export.

Open this file split-screen with [DEMO_SCRIPT.md](DEMO_SCRIPT.md) while editing.

---

## Asset inventory — collect before opening Descript

```
/lacunex-demo/
  /vo/
    vo-01-cold-open.wav        20s, beats 0:00–0:20
    vo-02-template-pick.wav    13s, beats 0:20–0:33
    vo-03-conductor-named.wav  20s, beats 0:33–0:53
    vo-04-peak1-resume.wav     10s, beats 1:04–1:14 (post-silence VO only)
    vo-05-peak2.wav            ~18s, beats ~1:15.5–1:34 (after the 1.5s breathing hold)
    vo-06-peak3.wav            20s, beats 1:34–1:54
    vo-07-convergence.wav      ~13s, beats 1:54–~2:07 (stops before silence-tail)
    vo-08-brief-designer.wav   10s, beats 2:14–2:24
    [no vo for beats 2:24–2:30 — silent close]
  /screen/
    scr-B-template-pick.mp4
    scr-C-interview.mp4         (the long take — covers C/E/F regions)
    scr-E-anchor-return.mp4     (subset of scr-C if cleanly isolatable; otherwise re-cut)
    scr-F-letter.mp4            (subset of scr-C)
    scr-G-convergence.mp4
    scr-H-brief-designer.mp4
  /overlays/
    cold-open-quote-1-cloudflare.png
    cold-open-quote-2-covid.png
    cold-open-quote-3-hackney.png
    peak1-meta-notice-panel.png    (if rendered as image; otherwise screen-cap from app)
    convergence-chyron-54-243.png
    held-takeaway-card.png
    url-card.png
  /music/
    borealis-scott-buckley.mp3
  script.md
  README.txt                     (one-line provenance for each asset)
```

Filenames matter: Descript's "Replace media" feature is faster when filenames map 1:1 to scenes.

---

## Composition structure — 10 scenes

In Descript: **New project → Composition → paste the full VO script in the Script panel → Cmd/Ctrl+Enter at each beat boundary**. Rename Scenes:

| Scene | Range | Beat | Renamed to |
|---|---|---|---|
| 1 | 0:00–0:20 | Cold open | `01-cold-open` |
| 2 | 0:20–0:33 | Template pick | `02-template-pick` |
| 3 | 0:33–0:53 | Conductor + extraction | `03-conductor-named` |
| 4 | 0:53–1:14 | PEAK 1 — meta-notice | `04-peak1-meta-notice` |
| 5 | 1:14–1:34 | PEAK 2 — anchor return | `05-peak2-anchor-return` |
| 6 | 1:34–1:54 | PEAK 3 — letter | `06-peak3-letter` |
| 7 | 1:54–2:14 | Convergence map | `07-convergence` |
| 8 | 2:14–2:24 | Brief-designer reveal | `08-brief-designer` |
| 9 | 2:24–2:28 | Held takeaway sentence | `09-held-quote` |
| 10 | 2:28–2:30 | URL card | `10-url-card` |

---

## Per-scene checklist

### Scene 01 — cold-open (0:00–0:20)
- **Audio layer:** `vo-01-cold-open.wav` (Studio Sound: Medium; Underlord → Remove fillers + Shorten gaps).
- **Video layer:** none (no screen capture). The visuals are PNG overlays only.
- **Overlays (sequenced):**
  - 0:00–0:06 → `cold-open-quote-1-cloudflare.png` (fade-in 200ms)
  - 0:06–0:11 → `cold-open-quote-2-covid.png` (cross-fade 200ms)
  - 0:11–0:15 → `cold-open-quote-3-hackney.png` (cross-fade 200ms)
  - 0:15–0:20 → fade to black under VO summary line
- **Music:** Borealis layer present, gain ≈ –22 dB. Slight swell at 0:00, level by 0:05.
- **Test:** mute audio. Visuals alone read as "three failures, three domains" within 6 seconds. If they don't, redesign overlays before continuing.

### Scene 02 — template-pick (0:20–0:33)
- **Audio:** `vo-02-template-pick.wav`.
- **Video:** `scr-B-template-pick.mp4` — screen capture of `/host` → "invite link" hover (1s) → click "demo · both sides" → demo page loads.
- **Trim:** open on cursor approaching the "Civic Consultation" card. Close on the demo page rendering its opening question.
- **Overlays:** none.
- **Music:** continuous bed.
- **Test:** mute audio. The cursor's intent is legible in 5 seconds. If it isn't, re-record with slower cursor movement.

### Scene 03 — conductor-named (0:33–0:53)
- **Audio:** `vo-03-conductor-named.wav`.
- **Video:** `scr-C-interview.mp4` — first ~20s of the interview take.
- **Trim:** open as the participant's first reply lands. Close just before the ◆ badge appears.
- **Overlays:** none (the dashboard columns rising are the visual proof).
- **Music:** continuous bed.
- **Test:** mute audio. The columns visibly rise; the right pane shows real participant text. If columns don't read at 720p preview, add a subtle highlight animation in post.

### Scene 04 — peak1-meta-notice (0:53–1:14) — THE CLIMAX
- **Audio:**
  - 0:53–0:56: small click/UI sound of the badge appearing (optional — if `scr-C` captures it, leave the captured audio in)
  - **0:56–1:04: SILENCE.** No music. No VO. The 8-second silence drop is non-negotiable.
  - 1:04–1:14: `vo-04-peak1-resume.wav` enters. Music returns at –24 dB.
- **Video:**
  - 0:53–0:56: `scr-C-interview.mp4` continues — ◆ badge appears on a host turn, click registers.
  - 0:56–1:04: hold on the ◆ notice panel — either screen-cap of the panel itself (preferred — it's the actual product UI) or a generously-sized PNG overlay that renders the meta-notice text legibly. **No participant face. No two-shot. Just the panel and silence.**
  - 1:04–1:14: panel can stay or fade out as VO resumes.
- **Music silence drop:** in the music layer, **split clip at 0:56 and 1:04, delete the middle 8s, 200ms fade-out before / 200ms fade-in after.** This is the single most important edit decision in the entire video.
- **Test:** play scene 4 alone with eyes closed for the silent 8 seconds. There must be no audio at all — no music, no music tail, no breathing-room hum. If anything is audible, fix the cuts.
- **Then test:** play scene 4 with eyes open. The on-screen text must be readable in the 8 seconds. If not, increase the panel size or font weight before locking.

### Scene 05 — peak2-anchor-return (1:14–1:34)
- **Audio:**
  - 1:14–~1:24: VO begins (`vo-05-peak2.wav` — first segment, "Anchor return. The conductor brought back the Sarah-coffee thread...").
  - **~1:24–~1:25.5: 1.5s breathing hold.** No VO. Music continues underneath. The participant's reply line is alone on screen.
  - ~1:25.5–1:34: VO resumes ("…The resident's framing updates the column…").
- **Video:** `scr-E-anchor-return.mp4` (or subset of `scr-C`) — ↩ amber chip appears on a host turn pointing back to turn 3; column mutates in place (lived_experience row updates).
- **Overlays:** the ↩ ANCHOR RETURN panel and the participant reply line are rendered by the app. If the column mutation animation is subtle, add a soft amber highlight pulse in post.
- **Music:** continuous bed across the full scene.
- **Test:** the 1.5s hold must feel like *the line landing*, not like a stutter. If it feels like a stutter, the VO either side may be too tight — pad the silence to 1.8s.

### Scene 06 — peak3-letter (1:34–1:54)
- **Audio:** `vo-06-peak3.wav`.
- **Video:** `scr-F-letter.mp4` — the chat-to-letter transition + scroll to "What surfaced between the lines" pull-quote.
- **Overlays:** none (the letter view is the visual).
- **Music:** continuous bed.
- **Test:** the pull-quote must be readable at 720p. If it isn't (small font), burn in an overlay with a larger render of the quote for the duration of the hold.

### Scene 07 — convergence (1:54–2:14)
- **Audio:** `vo-07-convergence.wav` (~13s of VO over ~20s of visual; trailing silence is intentional).
- **Video:** `scr-G-convergence.mp4` — `/rounds/.../aggregate` page loads, force-directed map settles, cluster halos fade in, hover-highlight on left rail.
- **Overlays:** chyron `54 ◆ deployed · 243 considered` (bottom-right, 1:58–2:14, ~36pt italic serif).
- **Music:** continuous bed; the trailing ~7s silence (no VO) lets the cluster halos breathe.
- **Test:** the chyron must NOT obscure the cluster labels. Verify at 720p.

### Scene 08 — brief-designer (2:14–2:24)
- **Audio:** `vo-08-brief-designer.wav`.
- **Video:** `scr-H-brief-designer.mp4` — cursor flashes through `/host` template grid; "Civic Consultation" highlights, then cursor lands on "Brief Designer" card.
- **Overlays:** none.
- **Music:** continuous bed.

### Scene 09 — held-quote (2:24–2:28) — SILENT
- **Audio:** **NO VO.** Music begins fade-out at 2:26.
- **Video:** static `held-takeaway-card.png` overlay on a clean white background.
- **Overlays:** the held-quote PNG is the visual. Centred, Instrument Serif, 36pt.
- **Music:** continuous bed at full level until 2:26, then linear fade to –inf by 2:30.

### Scene 10 — url-card (2:28–2:30) — SILENT
- **Audio:** music tail completing fade-out by 2:30. No VO.
- **Video:** static `url-card.png` overlay.
- **Music:** ends at 2:30.

---

## Music layer — single config

- **Layer:** one audio layer named `music-borealis`, persists across all scenes.
- **Source:** `borealis-scott-buckley.mp3` (CC-BY 4.0).
- **Default gain:** –22 dB.
- **Ducking:** auto-duck against the VO layer at –12 dB attenuation, 300ms attack / 300ms release.
- **Critical edits:**
  - **Scene 04 silence drop:** split at 0:56 and 1:04, delete middle 8s, 200ms fades both sides.
  - **Scene 09 fade-out:** linear ramp from –22 dB at 2:26 to –inf by 2:30.
- **YouTube description (paste verbatim):**
  ```
  Music: 'Borealis' by Scott Buckley — released under CC-BY 4.0.
  www.scottbuckley.com.au
  ```

---

## Captions — burn-in

- **Source:** Descript auto-transcribes on VO import. Fix product names manually in the Script panel: "Lacunex", "Opus 4.7", "Anthropic", "Cloudflare", "Hackney".
- **Style:** 36–44pt white text, black 70%-opacity background box, bottom-third anchor.
- **Burn in on export.** Do NOT also upload an SRT to YouTube — that produces double captions.

---

## Audio cleanup

For each VO file:
1. Studio Sound: **Medium**. (Maxing it gives the AI-voice sheen judges notice.)
2. Underlord → **Remove filler words** + **Shorten word gaps** (spot-check; sometimes kills intentional beats).
3. Manually delete bad takes by selecting words in the Script panel and pressing Delete (audio goes with them).

Skip Underlord's "Style my video" auto-pass — it adds zooms, b-roll suggestions, and captions you don't want.

### Critical: disable "Remove silence" globally

Before running any cleanup pass, **disable any tool labelled "Remove silence" / "Shorten silences"**. The 8-second silence drop in Scene 04 and the 1.5-second hold in Scene 05 are intentional beats. Auto-cleanup tools will eat them the moment you look away.

### Build the timeline with `[GAP]` placeholders FIRST

The autonomous-tools research surfaced a workflow that prevents auto-cleanup from killing the silences:

1. In the Script panel, before importing any VO, insert explicit `[GAP 8s]` and `[GAP 1.5s]` placeholders at the silence positions.
2. Lock those gap clips on the timeline (right-click → Lock).
3. Then drop VO WAVs in beat-by-beat using **Replace Script Track** — Descript anchors WAVs to script lines around the locked gaps.
4. Add Scenes referencing OBS clips and PNGs/cards.
5. *Last:* turn on auto-captions and music ducking.

Locking the gaps before the WAVs land means cleanup tools can't accidentally remove them.

---

## QA passes

1. **0.5×** — listen for clicks, pops, abrupt cuts. Scene 04 silence drop must be silent (no tail, no hum).
2. **1×** — full watch. List ≤ 5 fixes.
3. **1.25×** — does pacing still make sense? If yes, original was too slow; tighten gaps.

Cap at two passes of fixes after the 1× watch. Ship.

---

## Export

- Publish → Export → Local file
- Format: **MP4**
- Quality: **High**
- Resolution: **1920×1080**
- Frame rate: match source (likely 60fps from OBS captures)
- **Captions: Burn in** (toggle in export dialog)
- Audio: 48kHz stereo
- Save to: `/export/lacunex-demo-v1.mp4`

Verify after export: open in VLC. Audio peaks ~–3dB on loud beats, captions visible, no black frames, total runtime ≤ 2:30.

---

## Re-record one beat

The killer feature for tight timelines:

1. Re-record `vo-NN.wav` externally to the same path (overwrite).
2. In Descript: select the old VO clip in scene NN's audio layer → **Replace media** → pick the new file.
3. Descript re-transcribes; script + captions update automatically. Re-trim screen capture in scene NN only; ducking + music continue across.

For tiny fixes (one wrong word): select the wrong words in the Script panel, delete, then **Overdub** (your trained voice clone) regenerates from typed text. Don't use Overdub for whole beats — uncanny.

---

## Common pitfalls

- **Layer scene-scope confusion.** "Persist across scenes" vs "Only this scene" is invisible until something appears where it shouldn't. Audit every layer's scope before export. (Music = persist; everything else = only this scene unless it's a logo lower-third.)
- **Studio Sound on already-clean audio** introduces phasing artifacts. If raw VO is good, leave it Off or Low.
- **Built-in stock music library (Storyblocks-powered):** YouTube Content ID risk, even on legitimately-licensed tracks. Use the Borealis MP3 you downloaded — not the in-app library.
- **Descript's built-in screen recorder** loses long sessions. External capture (OBS) every time.

---

## When to switch off Descript

Switch to **DaVinci Resolve** (free) if you need: precise keyframed motion, multicam sync, exact bitrate/codec control, or compositing with masks/blend modes. For VO + screen + light overlays + captions — Descript is the right call.

---

## Final pre-submit verification

Before pasting the YouTube URL into the submission form:

- [ ] Total runtime ≤ 2:30 (verify in VLC, not memory)
- [ ] Scene 04 silence drop verified — 8 seconds of pure silence under the ◆ panel
- [ ] Scene 05 1.5s breathing hold verified — no VO, music continues, participant line alone on screen
- [ ] Scene 09 silent close — no VO, held quote alone for 4s, music fading
- [ ] All on-screen text legible at 720p mobile preview
- [ ] Music attribution line in YouTube description
- [ ] Audio peaks at ~–3 dB; VO clear at 1.25× playback
- [ ] Played back once on phone in mobile data conditions
- [ ] Played back once on laptop with sound off — story readable from captions + visuals alone
