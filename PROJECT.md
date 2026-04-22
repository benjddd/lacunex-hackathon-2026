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
| Judging rounds | **Stage 1** async Apr 26–27 (top 6 advance). **Stage 2** live Apr 28 12:00 EST (top-6 **pre-recorded demos played**, judges deliberate). Top 3 + special-prize winners announced 13:45 EST. |

### Stage 1 judging criteria (weights matter)

| Criterion | Weight | What it actually asks |
|---|---|---|
| **Impact** | **30%** | Real-world potential. Who benefits, how much it matters, could this actually become something people use, **does it fit a listed problem statement**. |
| **Demo** | **25%** | Is the demo working and impressive; holds up; **genuinely cool to watch**. |
| **Opus 4.7 Use** | **25%** | Creative use **beyond basic integration**; surfaces capabilities that surprised even the judges. |
| **Depth & Execution** | **20%** | Pushed past the first idea; sound engineering; real craft, not a quick hack. |

⚠️ **Problem-statements list from the hackathon rules is not in hand yet.** The Impact criterion explicitly asks for fit to a listed problem statement — surface this ASAP so we can frame the pitch to match.

### Prize priority

- **Primary target: top 3 placement** (determined by the weighted criteria above).
- **Secondary target: the three special prizes below.** They are pursued *only where the work also lifts a main-criterion score* — not as independent build targets.

| Special prize | What main criteria it serves | Our posture |
|---|---|---|
| **Creative medium** (voice, POV, "made us feel something") | Demo (25%) — "genuinely cool to watch" | Chase in build: interviewer voice, literary takeaway, one felt beat in the demo video. ~2–3h, and the work is Demo polish anyway. |
| **"Where Claude belongs"** (novel problem, real-world impact) | Impact (30%) — breadth of use case, problem-statement fit | Chase in pitch + minor build: 2–3 stub templates visible in selector, framing in README and video. ~1–2h, same work we'd do for Impact. |
| **Best Managed Agents use** | Opus 4.7 Use (25%) + Depth & Execution (20%) | Conditional Fri add, leaning yes if Thu is clean. Gated on Thu milestones + Michael Cohen's talk 2026-04-23 18:00 IST. ~4–6h. |

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
| D12 | Role naming | **Host** (was "designer"). **Participant** retained (rejects "guest" — would hurt credibility with research / policy / expert-elicitation operators). |
| D13 | Natural-language template authoring | **Yes, but scheduled Thu afternoon** after meta-noticing core works. First cut if anything slips. Host never sees JSON — templates presented in human-readable form. |
| D14 | GitHub remote | **github.com/Attius-Digital-Art/captainsubtext**, I'll create via `gh` when ready. Public from Day 1 — commit-trail transparency matters for originality evidence. |
| D15 | Takeaway artifact sections | what_sharpened, surfaced_assumptions, open_questions, one_experiment, **+ what_you_already_have_that_is_relevant** |
| D16 | Founder brief reframed to **Founder Investment Evaluation** | Host = Investor, Participant = Founder. Fixes the Host/Participant separation the original framing collapsed (the founder was both roles). Objectives unchanged; persona updated to investor-doing-DD; `role_labels` field added to brief schema and UI reads it. Same `template_id`. |
| D17 | Second brief = **Civic Consultation** (Facilitator/Resident) | Authored Fri. Maximally different from Founder brief in tone + stakes; strongest Impact-30% evidence (non-feasible-today scale). Fallback: Expert Knowledge Elicitation. |
| D18 | Drop "3 stub briefs in selector" in favor of 2 **fully functional** briefs | A greyed-out selector reads as marketing; a real second brief that actually runs is the domain-neutrality proof. |
| D19 | Role labels per brief | `role_labels: { host, participant }` optional on brief; UI falls back to "Host/Participant." Enables Clinician/Patient, Facilitator/Resident, etc. without UI changes. |
| D20 | Anti-positioning refined | Post-hoc transcript analysis is trivial now; the uniquely-hard work is the conversation itself. Sharpens the USP line across README, video, written summary. |
| D21 | Terminology per glossary (INTERNAL §8) | User-facing never uses "JSON schema" / "extraction_schema" / "conductor" / "meta-noticing." |
| D22 | Stack concern resolved | Next.js + API routes is appropriate; Built-with-Opus-4.6 winners all won on domain fit, not infra sophistication. Stack stays. |

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

- [x] Public GitHub repo with README, LICENSE (MIT), install + run instructions (live at github.com/Attius-Digital-Art/captainsubtext)
- [ ] **Written summary: 100–200 words** (tight — draft in INTERNAL.md, final version on the submission form)
- [ ] **3-min demo video maximum** (hard cap). Pre-recorded video is what Stage 2 plays — there is no live demo.
- [x] All code in repo authored after Tue 2026-04-21 12:30 EST (git log shows it)
- [x] All components open source (MIT, no proprietary binaries)
- [ ] Submission form filled on CV platform (link pending — Q10)
- [ ] Verify video length ≤ 3:00 before submit

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

## 9. Current status — Day 1 close

**Day 1 gate met and then some.** Repo public at [github.com/Attius-Digital-Art/captainsubtext](https://github.com/Attius-Digital-Art/captainsubtext). What shipped beyond the original Day-1 target:

- Next.js scaffold + MIT LICENSE + README + CLAUDE.md + PROJECT.md + CALENDAR.md + INTERNAL.md (gitignored).
- Anthropic SDK + prompt caching on static blocks; model IDs isolated in one config.
- Conductor prompt + Extraction prompt (non-fatal failure path); stateless `/api/turn` route.
- Two-panel UI (ChatPane + DashboardPane) with live insight capture rendering.
- Founder brief (now reframed: **Founder Investment Evaluation**, Investor/Founder roles, `role_labels` supported through UI).
- Save-session endpoint + button (local-fs, dev-only; Fri deploy will switch to client download or Vercel KV).
- Synthetic participant mode: five cross-domain personas (founder / PM / academic / designer / operations) + `/api/simulate-participant` + `npm run sim` CLI for 10× faster Thu prompt iteration.
- Real test drive demonstrated the thesis: conductor made adaptive moves (*"That's the container, not the thing"*), extraction caught cross-turn inference (*"building for genuine market need vs. hackathon submission novelty"* as a load-bearing untested assumption).
- Resilience fixes (token ceilings raised; extraction failure non-fatal).

**Decisions locked tonight:** reframe D16, second brief D17, drop stubs D18, role labels D19, anti-positioning D20, terminology glossary D21, stack resolved D22.

**Open for Thu 08:00 IST:** start meta-noticing prompt module. Use synthetic participants to iterate. Watch Michael Cohen Managed Agents talk at 18:00 IST (gates Fri's Managed Agents decision). Decide demo subject by Thu 22:00 IST.

**Open for Fri:** Civic Consultation brief (authored fresh), Managed Agents post-session research agent (conditional on Thu talk), Vercel deploy.
