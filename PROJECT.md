# CaptainSubtext — Project State & Tracker

Living document. Update whenever scope, timeline, decisions, or risks change.

---

## 1. What we're building

**CaptainSubtext** — platform for goal-directed, adaptive interviews.

The three-beat thesis (every demo moment must serve at least one):

1. **Strategic delegation** — the designer thinks about *what* to learn (goals, hypotheses) and hands the *how* to the platform.
2. **Live adaptive decision-making** — questions are generated turn-by-turn based on state; not a pre-written flow. The platform also catches subtext (contradictions, hedging, implied-not-said).
3. **Bilateral value** — designer receives structured insight generated during (not after) the conversation; participant receives reflective clarity, potentially including how to better use what they already have or reorganize existing work.

Four Claude calls: **meta-noticing, conductor, extraction, takeaway synthesis**. See prompt architecture in in-session notes (not committed).

---

## 2. Hackathon constraints (non-negotiable)

| Item | Value |
|---|---|
| Event | Anthropic "Built with Opus 4.7" hackathon |
| Hack window | Tue 2026-04-21 12:30 EST → Sun 2026-04-26 20:00 EST |
| **Submission deadline** | **Sun 2026-04-26 20:00 EST = Mon 2026-04-27 03:00 IST** |
| Today (IST) | Wed 2026-04-22 |
| User working hours | ~14h/day (08:00–22:00 IST), last day until 03:00 IST |
| Required artefacts | 3-min demo video (YouTube/Loom/similar) + public GitHub repo + written description |
| Open-source rule | **Every component** (backend, frontend, models, prompts) must be OSS under an approved license |
| Originality rule | **Built entirely during the hackathon** — no pre-existing code/content |
| Judging rounds | R1 async Apr 27 → R2 live Apr 28 12:00 EST → winners 12:45 EST |

### Special prizes we're targeting

| Prize | Our posture | Cost |
|---|---|---|
| **Creative medium** (voice, POV, "made us feel something") | **Chase in build.** Sharpen interviewer persona; make the takeaway literary; bake a "felt" beat into the demo. | ~2–3h |
| **"Where Claude belongs"** (novel problem, real-world impact) | **Chase in pitch language only.** Position on bilateral value + civic-engagement adjacency in README and pitch. No extra build. | ~1h writing |
| **Best Managed Agents use** | **Conditional Fri add.** Post-session research agent that runs 5–15min, produces deeper briefing for designer. **Gated on Thu progress + Michael Cohen's talk 2026-04-23 18:00 IST.** | ~4–6h |

### Critical calendar items

| When (IST) | Event | Action |
|---|---|---|
| **Thu 2026-04-23 18:00 IST** | "Claude Managed Agents with Michael Cohen" live session | **Watch live if we're pursuing Prize C.** |
| Fri 2026-04-24 00:00 IST | Live Session Three (Mike Brown, prev winner) | Optional; watch if energy permits. |
| Sun 2026-04-27 01:00 IST | Submissions open in CV platform (prior hours) | Final buffer. |

---

## 3. Timeline (IST, assumes ~14h working days)

| IST date | Target (end of day) |
|---|---|
| **Wed 2026-04-22 (today)** | Next.js scaffold • Anthropic client + caching • founder-product-ideation template in repo • minimal conductor loop running text-only • simple chat UI • live extraction wired (even if skeletal) |
| Thu 2026-04-23 | Split-screen designer dashboard polished • meta-noticing layer live • takeaway synthesis at session end • **dry-run on a real topic, iterate meta-notice prompts until they genuinely surface something** • **prompt-freeze gate** |
| Fri 2026-04-24 | Voice layer integrated (or cleanly deferred) • polish visuals • 2–3 stub templates in selector to demo range • Vercel deploy • README |
| Sat 2026-04-25 | Record demo interview (≥3 takes, different topics/subjects) • edit to 2 min of interview + ~1 min framing • pitch framing finalized |
| Sun 2026-04-26 | Final video edit • written description • submit before 03:00 IST Mon |

**Slack:** with 14h/day we have ~70 usable hours. The original doc assumed ~8h/day × 5 = 40h. We have headroom but not so much that we can afford to burn a full day on voice if it jams.

---

## 4. Decisions locked

| # | Decision | Value |
|---|---|---|
| D1 | Platform name | **CaptainSubtext** (tentative; reopenable post-dry-run) |
| D2 | Demo template | Founder Product Ideation fully wired + 2–3 **stub** templates visible in selector (not functional) to show range |
| D3 | No template editor in POC | JSON config on disk; may be augmented by a one-shot natural-language authoring flow (see Q1 below) |
| D4 | Text-first | Ship text cleanly before voice; voice decision revisited Thu |
| D5 | Stack | Next.js 15 App Router + TypeScript + Tailwind, deployed to Vercel |
| D6 | License | **MIT** |
| D7 | Model mapping (initial) | Meta-noticing + Conductor + Takeaway = `claude-opus-4-7`; Extraction = `claude-haiku-4-5`. Verify availability before first wiring. |
| D8 | Prompt caching | On for system + template + examples; transcript appended per turn |
| D9 | No auth / no DB for POC | Session state in memory per browser tab |
| D10 | Original scoping docs stay out of repo | They're thinking material, not product. The repo contains only work authored in-session. |
| D11 | Git initialized locally today | Commits timestamped inside hackathon window — originality evidence |

---

## 5. Decisions still open

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | Include a one-shot **natural-language template authoring** flow? (designer types a goal in prose, Claude generates the JSON template). Strong non-engineer story. | Needs user decision today | Partially — affects scope of Day-1 UI |
| Q2 | Rename "designer" role — candidates: Host, Architect, Facilitator, Strategist, Interview Director | Needs user decision before README | Low |
| Q3 | Voice stack: STT+TTS (Deepgram + ElevenLabs) vs visual avatar (D-ID / HeyGen) vs defer | Revisit Thu evening | No for text path |
| Q4 | Demo subject for recorded video | User (start with current plan, reflect later) | Not yet |
| Q5 | Anthropic API key provisioning | User's personal key first | **Yes at first Claude call** |
| Q6 | GitHub remote: account, repo name, public-from-start vs private-→-public-Sat | User | Day 1 end |
| Q7 | Hosting specifics (Vercel default) | Confirm later | No |
| Q8 | Video recording tool (Loom vs OBS vs screen-rec + separate audio) | User | Blocks Sat |
| Q9 | Which 2–3 stub templates for range demo (see Internal notes for candidates) | Propose Day 2 | No |
| Q10 | Submission platform link — the actual URL | User | Needed before Sun |

---

## 6. Core product USPs (to surface in README and pitch)

- **Not a questionnaire.** Every conversation is different. No pre-written question list — goal-aware live generation.
- **Not post-hoc research analysis.** Structured insight emerges *during* the conversation, not after.
- **Dual value.** Designer gets synthesized insight; participant gets reflective clarity — including, when relevant, actionable self-insight about existing resources or processes they can redirect.

---

## 7. Submission checklist

- [ ] Public GitHub repo with README, LICENSE (MIT), install + run instructions
- [ ] Written project description (problem, what it does, why Claude specifically)
- [ ] 3-min demo video on YouTube/Loom/similar
- [ ] All code in repo authored after Tue 2026-04-21 12:30 EST (git log will show this)
- [ ] All components open source (no proprietary binaries bundled)
- [ ] Submission form filled on CV platform (link pending)
- [ ] Verify video length within hackathon spec

---

## 8. Risks we are actively watching

| Risk | Impact | Mitigation |
|---|---|---|
| Voice integration eats Fri/Sat and breaks demo polish | High | Hard cut: if voice isn't clean by Fri evening IST, ship text-only with a single voice stub |
| Meta-notices feel canned in demo — kills the "wow" moment | High (product thesis) | Thu is dedicated to iterating meta-noticing prompts against a real dry-run transcript |
| Managed Agents add (Prize C) eats into core polish | Medium | Hard gate: only proceed Fri if Thu core is solid and Michael Cohen's talk shows a clean path |
| "Just another AI interviewer" perception from judges | Medium (dilutes Prize B + main) | Positioning in README/pitch emphasizes bilateral value + non-questionnaire + live-not-post-hoc |
| No demo subject decided → Sat recording is weak | Medium | Start with current plan; reflect during first real test Thu evening |
| Anthropic API key not provisioned when I need to wire the first call | Medium | User aware; will ping on first blocker |
| Model ID drift — we code to Opus 4.7 but availability changes | Low | Model IDs in one config module |
| "Designer" role name reads as too design-agency-flavored | Low | Kept in one locale file for one-edit rename |

---

## 9. Current status

**Phase:** Repo baseline. Git initialized. `.gitignore`, `CLAUDE.md`, `INTERNAL.md`, `PROJECT.md` in place. Next.js scaffold pending outcome of remaining questions.
