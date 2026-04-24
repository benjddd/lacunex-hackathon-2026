# Lacunex — Project State & Tracker

Living document. Update whenever scope, timeline, decisions, or risks change.

---

## 1. What we're building

**Lacunex** — platform for goal-directed, adaptive interviews.

The platform thesis rests on three beats:

1. **Strategic delegation** — the Host thinks about *what* to learn (goals, hypotheses) and hands the *how* to the platform.
2. **Live adaptive decision-making** — questions are generated turn-by-turn based on state; not a pre-written flow. The platform also catches cross-turn patterns (contradictions, hedging, implied-not-said).
3. **Bilateral value** — Host receives structured insight generated during (not after) the conversation; participant receives reflective clarity, potentially including how to better use what they already have or reorganize existing work.

Four Claude calls: **meta-noticing, conductor, extraction, takeaway synthesis**. See prompt architecture in in-session notes (not committed).

---

## 2. Hackathon constraints (non-negotiable)

| Item | Value |
|---|---|
| Event | Anthropic "Built with Opus 4.7" hackathon |
| Hack window | Tue 2026-04-21 12:30 EST → Sun 2026-04-26 20:00 EST |
| **Submission deadline** | **Sun 2026-04-26 20:00 EST = Mon 2026-04-27 03:00 IST** |
| Hack started (Day 1) | Wed 2026-04-22 |
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

⚠️ **Problem-statements list from the hackathon rules is not in hand yet.** The Impact criterion explicitly asks for fit to a listed problem statement — surface this ASAP.

*Prize posture and special-prize strategy → [INTERNAL.md](INTERNAL.md) §1 and §3.*

### Critical calendar items

| When (IST) | Event | Action |
|---|---|---|
| **Thu 2026-04-23 18:00 IST** | "Claude Managed Agents with Michael Cohen" live session | **Watch live if pursuing Managed Agents (D40 gate).** |
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
| D1 | Platform name | **Lacunex** — renamed from Ambitext Apr 24; domain `lacunex.com` registered, Vercel wired. Prior name "Ambitext" rejected: "text" suffix pulled toward wrong category. |
| D2 | Demo template | Founder Product Ideation fully wired + 2–3 **stub** templates visible in selector (not functional) to show range |
| D3 | No template editor in POC | JSON config on disk; may be augmented by a one-shot natural-language authoring flow (see Q1 below) |
| D4 | Text-first | Ship text cleanly before voice; voice decision revisited Thu |
| D5 | Stack | Next.js 15 App Router + TypeScript + Tailwind, deployed to Vercel |
| D6 | License | **MIT** |
| D7 | Model mapping (initial) | Meta-noticing + Conductor + Takeaway = `claude-opus-4-7`; Extraction = `claude-haiku-4-5`. Verify availability before first wiring. |
| D8 | Prompt caching | On for system + template + examples; transcript appended per turn |
| D9 | No auth / no DB for POC | Session state in memory per browser tab |
| D10 | Original scoping docs stay out of repo | They're thinking material, not product. The repo contains only work authored in-session. |
| D11 | Git initialized locally today | Commits timestamped to establish the in-window build record |
| D12 | Role naming | **Host** (was "designer"). **Participant** retained (rejects "guest" — would hurt credibility with research / policy / expert-elicitation operators). |
| D13 | Natural-language template authoring | **REVERSED AND SHIPPED.** Initially cut; rebuilt Day 4 as `/start` page with Opus 4.7 generator. User describes use case in plain text → Opus generates brief schema → structural defaults merged server-side → stored in sessionStorage → participant page loads it. |
| D14 | GitHub remote | **github.com/Attius-Digital-Art/captainsubtext**, public from Day 1. |
| D15 | Takeaway artifact sections | what_sharpened, surfaced_assumptions, open_questions, one_experiment, **+ what_you_already_have_that_is_relevant** |
| D16 | Founder brief reframed to **Founder Investment Evaluation** | Host = Investor, Participant = Founder. Fixes the Host/Participant separation the original framing collapsed (the founder was both roles). Objectives unchanged; persona updated to investor-doing-DD; `role_labels` field added to brief schema and UI reads it. Same `template_id`. |
| D17 | Second brief = **Civic Consultation** (Facilitator/Resident) | Authored Fri. Maximally different from Founder brief in tone + stakes; strongest Impact-30% evidence (non-feasible-today scale). Fallback: Expert Knowledge Elicitation. |
| D18 | Drop "3 stub briefs in selector" in favor of 2 **fully functional** briefs | A greyed-out selector reads as marketing; a real second brief that actually runs is the domain-neutrality proof. |
| D19 | Role labels per brief | `role_labels: { host, participant }` optional on brief; UI falls back to "Host/Participant." Enables Clinician/Patient, Facilitator/Resident, etc. without UI changes. |
| D20 | Anti-positioning refined | Post-hoc transcript analysis is trivial now; the uniquely-hard work is the conversation itself. Sharpens the USP line across README, video, written summary. |
| D21 | Terminology per glossary (INTERNAL §8) | User-facing never uses "JSON schema" / "extraction_schema" / "conductor" / "meta-noticing." |
| D22 | Stack concern resolved | Next.js + API routes is appropriate; domain fit over infra sophistication. Stack stays. |
| D23 | **Voice: CUT formally.** | Subagents 2 + 3 both recommend. 3-min pre-recorded video doesn't need voice to be "cool to watch" — live-filling dashboard + meta-notice beat is visibly stronger than janky voice. Reallocates Fri time to Managed Agents + polish. |
| D24 | **Managed Agents go/no-go moved to Thu 22:00** | Was Fri 20:00 — structurally too late (sunk-cost at that gate is how projects die with a half-wired agent). **Default: no.** Only flip to yes if the Michael Cohen talk at 18:00 IST reveals a concrete 3-hour implementation path. |
| D25 | **Thu 08:00–18:00 compressed to meta-noticing only + 60-min competitor scan** | Was multi-item (meta-noticing + takeaway + authoring). Takeaway already shipped today; authoring demoted to Sat-if-time. Single focus on meta-noticing Thu morning is the highest-leverage work remaining. |
| D26 | **Meta-noticing kill rule baked into prompt schema** | Per devil's-advocate rubric: a notice only "counts" if it cites ≥2 distinct turn indices AND would not fire on either turn in isolation. The prompt requires `transcript_anchors: number[]` (≥2 unique) and `why_cross_turn: string`. Orchestrator rejects notices that fail the rule. If by Thu 22:00 no genuinely surprising notice emerges from synthetic-adversary runs, **meta-noticing is cut from the demo's peak beats**. |
| D27 | **Demo opens with a brief running**, not architecture | 0:00–0:30 is the interview + dashboard filling; architecture diagram is a 15–20s reveal mid-video. Video storyboard detail → [INTERNAL.md](INTERNAL.md) §2. |
| D28 | **Numeric compression claim — LOCKED:** *"15 minutes → structured insight that would take a researcher 3 hours to extract post-hoc."* | Defensible: post-hoc transcript analysis + thematic coding on a 15-min interview is documented at 2–4 hours in qualitative research literature. |
| D29 | `what_you_already_have_that_is_relevant` protected as closing frame | Differentiating section: names resources already in the participant's life they hadn't connected to the question. Prompt hardened with transcript-anchor examples. Demo video closing beat — see [INTERNAL.md](INTERNAL.md) §13. |
| D30 | **Dual naming: CaptainSubtext (internal/repo) + Lacunex (external/brand)** | GitHub repo stays `captainsubtext` (established history, internal identifier). All user-facing surfaces — README title, UI, submission form, video — use **Lacunex**. Docs that reference both should name both. Use **"cross-turn reasoning"** in descriptive copy. Full analysis → [INTERNAL.md](INTERNAL.md) §12a. *(Supersedes the earlier "keep CaptainSubtext for UI" verdict; D1 locked Lacunex as the public brand Apr 24.)* |
| D31 | **Rounds as first-class entity** | Shipped. A round groups N sessions run against the same brief. Storage `transcripts/rounds/round-<id>.json`. API: GET/POST `/api/rounds`, GET/POST `/api/rounds/[id]`, POST `/api/rounds/[id]/aggregate`. UI: `/rounds` list + `/rounds/[id]` detail with aggregate view. Demonstrates comparable structured signal across N participants — the core platform promise. |
| D32 | **Cross-participant aggregation with 6 pattern types** | Shipped. `callAggregate` Opus 4.7 call takes N sessions, returns: convergent_problem / divergent_framing / shared_assumption / recurring_hedge / outlier / unasked_across_cohort patterns, top themes, signal strength per objective, routing recommendations ("you should also loop in X about Y"). Verbatim quotes cited per pattern. |
| D33 | **Meta-noticing wired live into /api/turn** | Restored in commit 28edb63 after loss during subagent branch operations. Runs in parallel with Extraction on every turn past the 2nd participant turn. Candidates passed to Conductor. Response includes `notices: {candidates, deployed}`. Conductor deploy rate-cap and suppression rules enforced. |
| D34 | **Subagent-driven feature bundle** | All shipped: cross-participant aggregation (D31/D32), `outside_consideration` meta-notice type, protected `what_you_already_have` takeaway section, N2 objective stall detector (commit 940e338), N3 anchor_return. Bundle complete. |
| D35 | **Demo video news hooks locked** | Trio: Cloudflare Nov 2025 postmortem, Grenfell Phase 2, nuclear tacit-knowledge loss. Verbatim quotes and rationale → [INTERNAL.md](INTERNAL.md) §13b. |
| D36 | **Managed Agents pre-briefing for Cohen talk** | Conditional GO at ~6-hour scope IF Cohen talk confirms (a) `web_search`+`web_fetch` available, (b) stable file I/O, (c) no account allowlist blocks. Default NO. |
| D37 | **Host journey complete** | Round creation (brief selector + participant count), shareable `/p/[templateId]?round=[id]` link shown on creation + in round detail, participant page reads `?round=` and auto-saves session on End. Rounds and sessions pages show hosted-mode notice on Vercel. |
| D38 | **Goal→outcome traceability in dashboard** | Each host turn now carries `objective_id`. DashboardPane shows collapsible "what we're trying to learn" per objective (goal text + success criteria + turn indices). Causal chain visible: goal → questions → extraction result. |
| D39 | **Token + timing logs** | All 4 Claude calls log ms + input/output/cache_read/cache_write token counts to server console. Now visible during prompt iteration. |
| D40 | **Managed Agents — implementation direction settled** | Unique value: post-session claim-verification agent. Reads transcript, identifies 2–3 factual claims, uses `web_search` to check them, appends "claims verified" section to takeaway. Directly demonstrates anti-confabulation thesis. Route: `/api/sessions/[id]/research`. Awaiting user GO after Cohen talk. |

---

## 5. Open questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q4 | Demo subject for recorded video | Resolved | Founder Investment Evaluation brief with scripted participant responses; full script in DEMO_SCRIPT.md. |
| Q8 | Video recording tool (Loom vs OBS vs screen-rec + separate audio) | User | Blocks Sat |
| Q10 | Submission platform link | Resolved | `https://cerebralvalley.ai/e/built-with-4-7-hackathon/hackathon/submit` (in SUBMISSION_DRAFT.md) |

*Resolved: Q1 (NL authoring cut, D13), Q2 (Host, D12), Q3 (voice cut, D23), Q4 (Founder brief + DEMO_SCRIPT), Q5 (API key live), Q6 (github.com/Attius-Digital-Art/captainsubtext, D14), Q7 (Vercel, D5), Q9 (2 functional briefs, D18).*

---

## 6. Core product USPs

Three layers, each solving a distinct host problem:

**Layer 1 — Study design** *(skill + time)*
The host states what they're investigating; the platform structures the inquiry: objectives, hypotheses, interview arc. Expert research-design capability, instantly, interactively. Partially shipped: `/start` NL authoring generates a brief schema. Full vision: multi-round study path designed collaboratively. Gives research methodology to anyone who lacks it.

**Layer 2 — Interview execution** *(skill)*
Every conversation is adaptive, non-scripted, professional-grade. Cross-turn reasoning, meta-noticing (contradictions, hedging, implied-not-said), live structured extraction, bilateral takeaway. The platform is the interviewer. Fully shipped.

**Layer 3 — Scale without quality collapse** *(capacity)*
1,000 conversations take the same time as 1. Every conversation is genuinely different; all serve the same strategic goals. Comparable signal across the whole cohort. Shipped: Rounds, cross-participant aggregation with 6 pattern types.

**Layer 4 — Synthesis** *(skill + time)*
Making sense of what came back — across many conversations — into something actually usable is its own skill and its own time sink. The platform delivers structured insight live during each conversation and cross-cohort patterns across the full round. Host ends with answers, not a transcript pile. Shipped: live extraction dashboard, cross-participant aggregation (6 pattern types, signal strength per objective, routing recommendations).

**Participant value (real but instrumental):**
Participants receive genuine reflective clarity — which makes them engage honestly, which gives the host better signal. The bilateral structure is a mechanism, not a moral stance.

**The host's felt gap (what the brand must speak to):**
They have a question only real people can answer. Getting that answer requires designing something they can't fully design, conducting conversations they're not trained to conduct, doing it at the scale they need, and making sense of what comes back. The platform closes all four gaps — without the host needing to be an expert in any of them.

**Anti-positioning:**
- Not a questionnaire / survey builder (adaptive, not scripted)
- Not post-hoc transcript analysis (insight during and across, not after)
- Not a single-conversation tool (rounds, cohorts, comparable signal)
- Not enterprise-only (self-serve from day one)

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
| Meta-notices feel canned in demo — kills the thesis proof | High | Thu is dedicated to iterating meta-noticing prompts against a real dry-run transcript |
| Managed Agents feature add eats into core polish | Medium | Hard gate: only proceed Fri if Thu core is solid and Cohen talk shows a clean path |
| Brand differentiation: crowded "AI interviewer" category | Medium | README/pitch emphasizes bilateral value + non-questionnaire + live-not-post-hoc |
| No demo subject decided → Sat recording is weak | Medium | Start with current plan; reflect during first real test Thu evening |
| Anthropic API key not provisioned when I need to wire the first call | Medium | User aware; will ping on first blocker |
| Model ID drift — we code to Opus 4.7 but availability changes | Low | Model IDs in one config module |

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

---

## 10. Current status — Day 2 / Thu 2026-04-23

**Shipped beyond Day-1 baseline:**
- Meta-noticing wired live into `/api/turn` (parallel with Extraction; candidates → Conductor; deployed notice attaches to Host Turn with green chip in UI). Commit 28edb63.
- Post-Incident Witness Interview brief (`post-incident-witness.json`) — Investigator/Witness role labels, 5 objectives, full extraction schema. Second brief proves domain-neutrality of the four-call architecture.
- N3 `anchor_return` conductor move: new move_type, anchor_turn stored on Turn, amber chip rendered in ChatPane.
- 12 synthetic personas (up from 5). `confident_confabulator` added for testing overconfidence patterns.
- Screen separation: `/p/[templateId]` participant-only chat route (no dashboard); `/host` hub listing briefs + rounds + screen-separation explainer. Demo banner on `/`.
- Reasoning hover: Conductor's `reasoning` field now stored on Turn, surfaced as collapsible "why this question?" disclosure in the host/combined view only.
- Civic Consultation brief (`civic-consultation.json`) — Facilitator/Resident, 5 objectives. Third brief for maximum domain-neutrality proof.
- Conductor prompt hardening: echo/elaboration probe rule, wrap-up bookend (open check-in before wrap_up), defensiveness handling, mood/tone adaptation.
- README architecture diagram updated to show all four calls + meta-noticing in parallel pipeline.
- "Making of" document written (gitignored, submission material).
- Demo round: 15 synthetic sessions aggregated. 10 themes, 10 patterns.

**Open gates:**
- Thu 22:00 IST: Managed Agents go/no-go + demo subject decision.
- Fri: Vercel deploy (save-session → client-side download fallback on hosted env), final polish.
- Sat: Record demo video (AI-produced: screen recording + ElevenLabs voiceover + Descript assembly).

---

## 11. Current status — Day 3 / Thu 2026-04-23 (continued)

**Shipped this session:**
- N2 stall detector: conductor receives `stall_turns` per objective, fires soft rule at ≥4/≥6 turns. Commit 940e338.
- Host journey complete (D37): round creation with brief selector + participant count, shareable participant link shown in `/rounds` and `/rounds/[id]`, participant page reads `?round=` and auto-saves on End. Commit 0677737.
- Goal→outcome traceability (D38): `objective_id` stored on host turns, DashboardPane exposes "what we're trying to learn" + turn indices per objective. Commit 4cc52ca.
- Input auto-refocus fix: textarea re-focuses after each host turn (demo UX). Commit 4cc52ca.
- Token + timing logs (D39): all 4 Claude calls log ms + token counts including cache_read/cache_write. Commit 4cc52ca.
- Vercel hosted-mode: rounds GET returns `hosted: true` flag, UI shows local-deployment notice. Commits 76519e1, 7f78416.
- Round creation UX: participant count field, hosted-mode notice, Vercel-safe GET. Commit 7f78416.
- D13 formally closed (NL template authoring cut from scope).
- D28 locked: "15 minutes → 3 hours saved" compression claim.
- Model IDs verified: `claude-opus-4-7` correct (no date suffix), Haiku suffix confirmed.
- Claude Design verified as real product with Claude Code handoff.

**Open gates:**
- **Managed Agents (D40):** user watching Cohen talk. GO signal → build `/api/sessions/[id]/research` claim-verification agent today. NO-GO → move to Fri polish.
- **6 civic simulations:** running in background (bdoxl3et7). Aggregate after completion.
- **Problem statements:** user must visit the submission form to inspect the "Track Name" dropdown — can't be found externally.
- **Demo subject (Q4):** still undecided. Gate: today by end of Cohen talk.
- **Terminology pass:** UI still uses some internal terms (objectives, meta-noticing). Low priority, Fri task.
- **Sat:** Record demo video. Tool recommendation: ScreenApp (free) + ElevenLabs voiceover OR one month Pictory (~$30).
- **Sun:** Final video edit + written summary + submit.
- Sun: Submit.

---

## 12. Current status — Day 4 / Thu 2026-04-23 (late session)

**Shipped this session (autonomous):**
- NL brief generator: `POST /api/generate-brief` + `/start` page with collapsible generator panel, preview card, stores to `sessionStorage`, `/p/[templateId]` reads `gen-` prefix and loads from sessionStorage. D13 status: **REVERSED — NL authoring built after all.**
- `@vercel/kv` persistence: `src/lib/store-hosted.ts` rewritten to async KV-backed store (Upstash Redis via REST API) with in-memory fallback. All hostedSave/Get/List functions async; all callers updated.
- Takeaway peek flow: `handleEndSession` no longer auto-opens takeaway; animates "Preparing your reflection…"; "See your reflection →" button appears when ready. Reduces cognitive interruption at session close.
- Round stats panel in `/rounds/[id]`: sent/started/completed/abandoned counts + progress bar (completion threshold = 6 turns) + response rate + "Closes [date]" if target date set.
- Round target date: `target_date: string | null` on Round, form field in `/rounds`, shown in RoundStats.
- Judges walkthrough overlay: `?` button on `/`, 5-panel modal explaining participant chat, host dashboard, tracking strip, ◆ meta-notice badges, ↩ anchor-return chips.
- MAKING_OF.md: 200+ line build journal — architecture rationale, Opus-as-partner narrative across 6 layers, what cross-turn reasoning does that a single prompt can't.
- SUBMISSION_DRAFT.md: Field 4 (problem statement) rewritten with "too late / too shallow / react in real time" framing; Option A (Cloudflare/Boeing hook, verify flag) + Option B (clean version).
- Domain knowledge docs in `docs/domain/`: memory-science-for-interviewing.md, vc-failure-patterns.md, participation-frameworks.md.
- Fixture: `docs/fixtures/founder-session-example.json` — 15-turn curated session with annotated meta-notice and anchor_return.
- README updated: repository layout reflects actual routes and files; status section updated.

**Simulations running (autonomous):**
- 7 post-incident sessions in progress (incident_witness × 2, evasive_pm, thoughtful_but_scattered, retiring_domain_expert, confident_confabulator, overconfident_researcher).
- Purpose: produce demo-quality post-incident transcripts (brief was missing all synthetic data).

**Blockers — requires user action:**
- Upstash Redis provisioning: upstash.com → create Redis DB → copy `KV_REST_API_URL` + `KV_REST_API_TOKEN` → set in Vercel env vars → redeploy.
- Smoke-test live URL after redeploy.
- Demo video recording (Saturday).
- Verify/update GitHub URL in SUBMISSION_DRAFT Field 6 (repo currently still named `captainsubtext`).

**Pending autonomous tasks:**
- Evaluate simulation quality; commit best post-incident sessions as fixtures.
- Run synthesis on new post-incident round (after sessions save).
- Write Playwright demo script outline (for Saturday recording).

**Dates:**
- Deadline: **Sun 2026-04-26 20:00 EST = Mon 2026-04-27 03:00 IST**
- Sat: demo video recording
- Sun: final edit + submit
