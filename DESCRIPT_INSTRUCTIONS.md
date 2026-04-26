# Descript build sheet — Lacunex demo v2

One-shot instruction set for assembling the 2:40 cut from the v2 script. Target: **1080p30 H.264 MP4, captions burned in, ≤100 MB.**

**Authoritative source for verbatim text (VO + cards):** [DEMO_SCRIPT_v2.md](DEMO_SCRIPT_v2.md). This file is the *how*; that file is the *what*.

---

## Reality check — what Descript can and can't do

| Capability | Descript reliability | Strategy |
|---|---|---|
| Drop clips on a timeline, set in/out points | ✅ reliable | Use the app or REST API |
| Freeze frame, exact duration | ✅ reliable | Properties panel |
| Text layers — font/size/colour/position | ✅ reliable | Author each card as a Descript scene |
| Captions burned in from VO transcript | ✅ reliable | Underlord prompt |
| Cross-dissolve transitions, exact duration | ⚠ partial | Descript thinks in seconds, not frames — convert (12f@30fps = 0.4s) |
| Ducking (% audio attenuation) | ⚠ partial | Underlord supports % only — not dB / attack / release. Approximate. |
| **Speed ramp (5× → 1× over 0.4s)** | ❌ **manual** | **Pre-bake with ffmpeg** before importing |
| **Region tints (8% colour overlay over a pane half)** | ❌ **manual** | **Pre-bake into the source clip with ffmpeg** |
| Custom split-screen layout | ⚠ partial | Use Descript's multi-cam template, OR pre-bake the layout in ffmpeg |
| Underlord agent for free-form edits | ⚠ partial | Reliable for filler-removal, captions, basic zooms; flaky for everything else. **Treat it as a junior editor that lies about success** |

---

## Workflow phases

| Phase | Tool | Time |
|---|---|---|
| **A.** Pre-bake clips with ffmpeg | terminal | ~10 min |
| **B.** Record VO | any DAW or Descript Overdub | ~15 min |
| **C.** Build timeline in Descript | Descript app | ~25 min |
| **D.** Author text-scene cards | Descript app | ~10 min |
| **E.** Underlord pass | Descript app | ~5 min |
| **F.** Manual polish (mix, transitions, fades) | Descript app | ~15 min |
| **G.** Captions + export | Descript app | ~5 min |
| **Total** | | **~85 min** |

---

# Phase A — Pre-bake clips with ffmpeg

Three pre-bakes pull the things Descript can't reliably do out of the editor and into ffmpeg, so the Descript timeline only has to assemble.

Output directory: `transcripts/captures/_descript/`. Create it first:

```bash
mkdir -p transcripts/captures/_descript
```

## A1 — Beat 5 sped-up chat clip (with smooth-decel curve and freeze)

The script asks for **5×** speed across Beat 5, decelerating to **1×** at the focal participant turn, then freezing for 0.6s. ffmpeg can't smoothly ramp a single clip's speed, but it can concatenate **stair-step segments** that approximate a smooth decel. We use a 4-step ramp (5× → 3× → 2× → 1.5× → 1×) which reads as a curve at 30fps.

The source is `capture-c/interview-split-screen.webm`. You need to identify two timestamps in the source:
- `T_PRE` = start of the focal "small adjustments" participant turn, in source seconds. Subtract 1.2s from this if you want the ramp to *finish* on the focal turn rather than start there.
- `T_FREEZE` = the single frame inside the focal turn where the freeze should hold (typically `T_PRE + 1.2`)

Open the source in any video player, scrub to the participant's "small adjustments" turn, note source-time. Then:

```bash
# T_PRE and T_FREEZE in source-seconds. Adjust to your source.
# T_PRE marks the START of the decel ramp; T_FREEZE = T_PRE + 1.2s.
T_PRE=21.8       # source seconds where the decel ramp begins
T_FREEZE=23.0    # source seconds for the freeze frame (= T_PRE + 1.2)
SRC=transcripts/captures/capture-c/interview-split-screen.webm
OUT=transcripts/captures/_descript/beat5-speed-ramped.mp4

# Segment 1: 0 → T_PRE at 5× (the bulk of the sped-up chat)
# Segments 2–5: 0.3s of source each, at 3× / 2× / 1.5× / 1× — a 4-step decel
# Segment 6: freeze at T_FREEZE for 0.6s
ffmpeg -y -i "$SRC" \
  -filter_complex "
    [0:v]trim=0:$T_PRE,setpts=(PTS-STARTPTS)/5[fast];
    [0:v]trim=$T_PRE:$T_PRE+0.3,setpts=(PTS-STARTPTS)/3[r1];
    [0:v]trim=$T_PRE+0.3:$T_PRE+0.6,setpts=(PTS-STARTPTS)/2[r2];
    [0:v]trim=$T_PRE+0.6:$T_PRE+0.9,setpts=(PTS-STARTPTS)/1.5[r3];
    [0:v]trim=$T_PRE+0.9:$T_FREEZE,setpts=PTS-STARTPTS[r4];
    [0:v]trim=$T_FREEZE:$T_FREEZE+0.04,loop=loop=17:size=1:start=0,setpts=N/30/TB[freeze];
    [fast][r1][r2][r3][r4][freeze]concat=n=6:v=1:a=0[out]" \
  -map "[out]" -r 30 -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  "$OUT"
```

Output durations: ~T_PRE/5 sec of 5× footage + 0.1s + 0.15s + 0.2s + 0.3s of decel (≈ 0.75s of ramp output) + 0.6s freeze. Tune `T_PRE` so the total Beat 5 output runs ~13s before the freeze, and the freeze sits naturally inside the focal turn.

> **If the ramp still looks abrupt** (e.g. visible "step" between 5× and 3×): re-run with finer subdivision (5× → 4× → 3× → 2.5× → 2× → 1.5× → 1× across 0.7s of source instead of 1.2s).
>
> **Verify after encoding:** play `beat5-speed-ramped.mp4` at 0.5× in any player and watch the focal turn. The decel should *feel* like a deceleration into the freeze; if it doesn't, adjust `T_PRE`.

## A2 — Beat 4 sliding-reveal source clips (left-pane + full)

The split-screen reveal opens cropped to the participant pane (left ~960px) and slides out to full 1920×1080. Pre-bake **two synchronised clips** so Descript only has to scale-and-position them.

```bash
SRC=transcripts/captures/capture-c/interview-split-screen.webm

# Left pane only (for first 1.0s of Beat 4)
ffmpeg -y -i "$SRC" -t 4 -filter:v "crop=960:1080:0:0,scale=1920:1080" \
  -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  transcripts/captures/_descript/beat4-left-pane-only.mp4

# Full split (for the rest of Beats 4–7)
ffmpeg -y -i "$SRC" \
  -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  transcripts/captures/_descript/beat4-full-split.mp4
```

> **Simpler fallback:** skip A2 entirely and use the original `interview-split-screen.webm` directly. Open Beat 4 with a hard cut into the full split. You lose the slide reveal but save 5 minutes; the demo is still legible.

## A3 — Beat 4–7 pane tints (8% warm/cool overlays)

The script asks for warm-tinted participant pane (#FFF4E8 @ 8%) and cool-tinted host pane (#E8F1FF @ 8%). Descript can't tint a region; pre-bake in ffmpeg:

```bash
ffmpeg -y -i transcripts/captures/_descript/beat4-full-split.mp4 \
  -filter_complex "
    color=c=0xFFF4E8@0.08:s=960x1080,format=rgba[warm];
    color=c=0xE8F1FF@0.08:s=960x1080,format=rgba[cool];
    [0:v][warm]overlay=0:0[wt];
    [wt][cool]overlay=960:0[out]" \
  -map "[out]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p \
  transcripts/captures/_descript/beat4-full-split-tinted.mp4
```

Use `beat4-full-split-tinted.mp4` (not the un-tinted version) everywhere downstream. The tints are subtle — judges won't consciously register them, but the warm/cool cue helps the brain track which side is which when the gaze flicks across.

> **If A1's pre-baked speed-ramp clip needs the tint too**, run the same overlay command against `beat5-speed-ramped.mp4` and swap that one in too. Each tint pass ~30 seconds.

---

# Phase B — Record VO

Record one WAV per beat. Verbatim text comes from [DEMO_SCRIPT_v2.md](DEMO_SCRIPT_v2.md) — copy each `Voiceover` block.

| File | Beat | Source paragraph in script |
|---|---|---|
| `vo-01.wav` | Beat 1 | The 0:06–0:23 paragraph beginning *"Eleven residents. One brief…"* |
| `vo-02.wav` | Beat 2 | The 0:25.7–0:37 paragraph beginning *"I'm a systems analyst…"* |
| `vo-03.wav` | Beat 3 | The full Beat 3 paragraph including the *0.5s pause* and the *"I built this to close both gaps"* close |
| `vo-04.wav` | Beat 4 | *"You're now watching one of those eleven…"* |
| `vo-05.wav` | Beat 5 | *"Six turns in fifteen seconds. Watch the dashboard…"* |
| `vo-06a.wav` | Beat 6 | The rhetorical-question line: *"How long would a careful reader take to notice…"* |
| `vo-06b.wav` | Beat 6 | The post-silence line: *"That's the cross-turn move. The platform caught it in real time."* |
| `vo-07.wav` | Beat 7 | *"At session close, the participant opens a reflection she didn't write…"* |
| `vo-08.wav` | Beat 8 | *"Three workers run under one Conductor…"* |
| `vo-09.wav` | Beat 9 | *"And the brief itself? The platform writes it…"* |
| `vo-10.wav` | Beat 10 | *(silent close preferred — VO optional)* |

Recording specs: 48 kHz mono, peak around –6 dBFS, no compressor on input. Re-record any clip that has plosive pops or breath crunch — Underlord won't fix those.

---

# Phase C — Build timeline in Descript

Open Descript → **New project** → **Composition** (not Transcript). Set canvas to **1920×1080**, frame rate **30**.

Drop these on the timeline in order. Use **Insert mode**, not Replace, so each clip pushes downstream forward instead of overwriting.

| Track | Layer | Clip / asset | In | Out | Notes |
|---|---|---|---|---|---|
| Video 1 | scene | text scene `S1-question` | 0:00 | 0:06 | See Phase D |
| Video 1 | clip | `capture-g/convergence-map.webm` | 0:04 | 0:25 | Fades up under the question card from 0:04, takes over by 0:06 |
| Video 1 | scene | text scene `S2-personal` | 0:25 | 0:38 | See Phase D |
| Video 1 | scene | text scene `S3-thegap` | 0:38 | 0:53 | Same as S2 with the title removed; opacity 30→5% on background |
| Video 1 | clip | `_descript/beat4-left-pane-only.mp4` | 0:53 | 0:54 | Or `interview-split-screen.webm` as the simpler fallback |
| Video 1 | clip | `_descript/beat4-full-split.mp4` | 0:54 | 1:03 | Slide reveal — see Phase F |
| Video 1 | clip | `_descript/beat5-speed-ramped.mp4` | 1:03 | 1:18 | Pre-baked from Phase A1 |
| Video 1 | clip | continued split-screen capture | 1:18 | 1:38 | The ◆ panel + anchor cues are already in the captured live UI |
| Video 1 | clip | letter-takeaway segment of `capture-f` | 1:38 | 2:00 | Or use Plan B caption |
| Video 1 | scene | text scene `S8-architecture` | 1:58 | 2:20 | 2s pre-roll black built into the scene start |
| Video 1 | clip | `capture-h/brief-designer-reveal.webm` | 2:20 | 2:28 | Re-record this clip if it doesn't show mid-conversation |
| Video 1 | scene | text scene `S10-close` | 2:28 | 2:40 | See Phase D |
| Audio 1 | music | Borealis (loop or trim) | 0:00 | 2:40 | Music bed; level –22 dB default |
| Audio 2 | VO | vo-01 → vo-10 | per beat | per beat | See Phase F for ducking + the 5.6s music drop |

---

# Phase D — Author text scenes (5 cards)

All cards are static; build each as a Descript **Scene** with background colour and text layers.

## S1-question (0:00–0:06)

Background: `#0A0A09` (near-black).
One text layer, italic serif (Instrument Serif if available; otherwise Descript's default italic serif), **36pt**, white-ish `#F5F1E8`, centred, max-width 80%:

> *What does the platform find when nobody tells it what to look for?*

Animation: fade-in 0.5s at 0:00.0; fade-out 1.5s starting 0:04.0. Text fully gone by 0:05.5; scene ends 0:06.0 with cut to the convergence map.

## S2-personal (0:25–0:38)

Background: convergence-map still extracted as a PNG at frame `0:23` of `capture-g`, dimmed to **30% opacity** (use a black overlay layer at 70% on top, or pre-darken the PNG in any image editor).

One text layer, italic serif, **36pt**, off-white `#F5F1E8`, centred:

> *Lacunex — adaptive interviews, at scale.*

Animation: title fades in 0:25.0–0:25.6 (along with the background dim from the live convergence map). Title fades out at 0:38.0 ready for S3.

## S3-thegap (0:38–0:53)

Background: same dimmed convergence-map still as S2, opacity decaying from 30% → 5% over the beat (use a colour-overlay keyframe on a black layer above the still). No title text. By 0:52.5 the screen is effectively black; S4's pre-baked clip cuts in at 0:53.

## S8-architecture (1:58–2:20)

Background: solid `#0A0A09` (near-black). 2s of pure black at scene start (1:58–2:00) — the breath after Beat 7's letter fade-out — then the text fades up at 2:00.

Three text layers, all centred:

1. Top third (~18% from top) — monospace, **22pt**, white-ish `#F5F1E8`, letter-spacing wide, all caps:
   ```
   THREE PATTERNS, ONE LOOP
   ```
2. Middle (~42% from top) — monospace, **28pt**, white-ish `#F5F1E8`, single line:
   ```
   Orchestrator-Workers   ·   Parallelization   ·   Routing
   ```
3. Lower (~62% from top) — italic serif, **18pt**, warm off-white `#D9D2C2`, centred, two lines:
   ```
   from "Building Effective Agents"
   Schluntz & Zhang · Anthropic Engineering · Dec 2024
   ```

Optional: an 8-frame underline draw beneath the title between 1:59.7 and 2:00.0. Skip if Descript's animation timeline is fighting; not load-bearing.

## S10-close (2:28–2:40)

Background: solid `#0A0A09`.

Three text layers, centred:

1. Wordmark `Lacunex` — italic serif, **56pt**, white-ish `#F5F1E8`, at ~38% from top.
2. Three lines below (mono, **16pt**, warm `#D9D2C2`, centred, line-height 1.6):
   ```
   Built in five days. Open source.
   lacunex.com
   ```
3. Builder line at bottom 12% — italic serif, **14pt**, warm grey `#8A8377`:
   ```
   for anyone who needed to listen at scale
   and didn't have time.
   ```

Hold the full 12s. No animation needed beyond a fade-in over the cross-dissolve from Beat 9.

---

# Phase E — Underlord pass

Open the Underlord agent (sidebar in Descript). Run **only these two prompts, one at a time**, in order. Underlord is unreliable for anything more specific than this, so don't try.

## Prompt 1 — Generate captions

> *"Generate captions from the voiceover layer. Style: 36–44pt white text, black 70%-opacity background, anchored bottom-third. Burn in, do not export as separate SRT."*

Verify the captions read correctly — Underlord transcribes from VO so any mishearing has to be hand-corrected in the Captions panel.

## Prompt 2 — Auto-zoom on Beats 4–7 (optional)

Skip this if the demo body already has motion enough.

> *"On the segment from 0:53 to 1:58, where there's a static split-screen, add subtle zoom-in motion to the participant chat pane during long stretches without animation. Keep zoom strength low (max 1.05×). Do not zoom during the cross-turn ◆ moment between 1:15 and 1:35."*

If Underlord doesn't honour the time restriction, undo and skip.

**Don't ask Underlord for**: the speed ramp (already pre-baked), text-scene authoring (Phase D), the silence drop (Phase F), the architecture card (Phase D), captions outside the burn-in style (Phase F adjusts).

---

# Phase F — Manual polish

These are the operations Descript's automation can't reliably do. Each gets ~1–3 minutes by hand.

## F1 — Slide reveal at Beat 4 (0:53–0:55.2)

Two video clips on Video 1 (left-pane-only and full-split). Apply scale + position keyframes to whichever you used:

- If using **left-pane-only at 0:53–0:54**: the clip is already framed full-1920×1080 (because Phase A2 scaled the cropped left pane up). Hold for 1.0s.
- At **0:54.0**, switch to `beat4-full-split.mp4`. Apply scale 100% + position 0,0 (default). The transition between the two clips is a hard cut.
- Optional smoother feel: apply a 0.8s cross-dissolve between left-pane-only and full-split (Descript supports cross-dissolves via the Transitions panel; type `0.8` seconds).

**Simpler still**: drop the slide reveal entirely. Open Beat 4 with the full-split clip at 0:53. Persistent corner labels do the work.

## F2 — Persistent corner labels (0:53–1:58)

Two text layers across the entire demo body:

- `PARTICIPANT` — JetBrains Mono (or any installed monospace), **11pt**, `#888888`, top-left of left pane (x≈20, y≈20).
- `HOST DASHBOARD · LIVE` — same font/size/colour, top-left of right pane (x≈980, y≈20).

Set both layers to span 0:53.0 → 1:58.0. Fade-in 6 frames at 0:53.

## F3 — `×5` indicator (1:03–1:13)

One text layer:

- `×5` — JetBrains Mono **11pt**, `#888888`, top-right of left pane (x≈940, y≈20). Spans 1:03.2 → 1:13.0. Fade-in 6 frames, fade-out 6 frames.

## F4 — Beat 6 silence drop (1:17.4–1:23.0)

This is the climax beat — get it right.

1. On the music bed (Audio 1), split the clip at **1:17.4** and again at **1:23.0**.
2. Delete the middle segment (5.6s).
3. On the segment ending at 1:17.4: apply a 200ms fade-out.
4. On the segment beginning at 1:23.0: apply a 200ms fade-in.
5. The bed level after 1:23.0 should be **–24 dB** (was –22 dB before the drop). Type the new value in the volume control.

## F5 — VO ducking on the music bed

Underlord's "Lower audio of other layers" supports a percentage but not dB / attack / release. Approximate:

- Set ducking to **35%** (≈ –9 dB attenuation, close to the script's –12 dB target).
- Apply per VO clip, OR apply globally on Audio 2 → "Duck other layers."

Re-listen with headphones; if VO is buried, drop the ducking percentage to 25% (more cut on the music).

## F6 — Beat 1 silent open + cluster-label timing

Three cluster labels need to appear in sync with VO mentions:

- *self-censorship around being read as anti-progress* — at **0:13.0**
- *dependents nobody named out loud* — at **0:16.0**
- *preemptive adaptation before policy is live* — at **0:18.0**

These labels are part of the captured `convergence-map.webm` (the live UI surfaces them automatically as the cohort settles). If the timing in the capture doesn't line up with the VO, your options are:

- **Re-record capture-g** with the playwright script timing tweaked. ~5 min.
- **Add overlay text layers** in Descript matching the live label style. ~10 min.
- **Accept misalignment** — the labels surface at *some* point in the first 25s; the VO names them; viewers will read both and assume causality.

## F7 — Beat 7 letter morph

If `capture-f/takeaway-static.webm` doesn't include the participant clicking "See your reflection →" and the surface morph:

- Plan B: hold a static letter-view PNG on Video 1 from 1:38 to 2:00. Add a short caption layer at 1:38–1:39.5: *"At session close — a reflection for the participant"* (italic serif 18pt, white, lower third).

## F8 — Beat 7 → Beat 8 black breath

At 1:57.0–1:58.0, fade Beat 7's video to black over 1.0s. The S8-architecture scene already has 2s of pure black built into its start (1:58–2:00); the card text fades up at 2:00.0. Total black-breath = 3s. Don't shortcut this — it's the cut that buys the architecture flex its weight.

## F9 — Beat 9 → Beat 10 cross-dissolve to black

At 2:27.5, apply a 12-frame (0.4s @ 30fps) cross-dissolve on the brief-designer clip to pure black. S10-close scene fades up from 2:28.

## F10 — Music fade-out

Music bed begins fading at 2:38; completes silence by 2:40. One-frame hold of black after.

---

# Phase G — Captions + export

## Captions

Captions were generated in Phase E. Verify:

- Burned-in (not exported as SRT alongside).
- Style: 36–44pt white, black 70%-opacity background, bottom-third anchor.
- All captions match VO verbatim (Underlord transcribes; misheard words happen). Spot-check the proper nouns: **Lacunex**, **Opus 4.7**, **Anthropic**, **Schluntz & Zhang**, **Orchestrator-Workers**.

## Export

Descript → **Publish** → **Export as MP4**:

| Setting | Value |
|---|---|
| Resolution | 1920×1080 |
| Frame rate | 30 |
| Codec | H.264 |
| Quality | High |
| Audio | 48 kHz, stereo, AAC 192 kbps |
| Captions | **Burned in** |
| Output filename | `lacunex-demo-v2.mp4` |

Target file size: under 100 MB. If over, re-export at quality "Medium" and re-check.

## Local QA

| Pass | What to check |
|---|---|
| 1× on laptop with sound | VO clear over Borealis; ducking sounds natural; Beat 6 silence drop is clean |
| 1× on phone, mobile data, sound off | Story readable from captions + visuals alone |
| 1.25× on laptop | Pacing still makes sense; if it does, original was too slow — note for future |
| 0.5× spot-check on Beat 6 | No clicks, pops, or abrupt fades around the 1:17.4–1:23.0 silence |

## Upload

YouTube → **Unlisted upload**. Title: `Lacunex — adaptive interviews, at scale (Built with Opus 4.7 hackathon, Apr 2026)`. Description (paste verbatim):

```
Lacunex runs goal-directed adaptive interviews with cross-turn reasoning rendered live.

Built for the Anthropic "Built with Opus 4.7" hackathon, April 2026.
github.com/Attius-Digital-Art/lacunex
lacunex.com

Music: 'Borealis' by Scott Buckley — released under CC-BY 4.0.
www.scottbuckley.com.au
```

Wait 10–20 min for HD processing. Open the live URL on phone (with sound off) and laptop (incognito, with sound on). Final URL goes in Submission Field 7.

---

# Backstops

If something is fighting you and the clock is running out:

- **Speed ramp jolt at Beat 5 transition** → cut the ramp segment from the ffmpeg pre-bake; do a hard cut from 5× to 1×. Less polished, but cleaner than a botched ramp.
- **Letter morph (Beat 7) won't compose** → use Plan B: static letter PNG with a 1.5s caption.
- **Underlord caption pass produces garbage** → bypass Underlord; use Descript's manual caption generator from the Transcript pane.
- **Cluster-label timing in Beat 1 is hopelessly off** → re-record `capture-g` with adjusted Playwright timing — ~5 min round-trip.
- **Custom font missing on the system** → fall back to Descript's defaults (any clean italic serif + any monospace). The cards still read.
- **Total runtime over 2:50** → trim Beat 5 by 2s (sped-up segment); trim Beat 7 letter hold by 2s. Don't trim Beat 6's silence drop; it's the climax.

If the v2 cut isn't holding by 23:00 IST: revert to v1 ([DEMO_SCRIPT.md](DEMO_SCRIPT.md)). Same captures, same VO recording, different post-production — and the v1 cut was already production-ready.
