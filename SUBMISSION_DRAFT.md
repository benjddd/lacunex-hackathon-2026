# Submission Draft — Lacunex
> Internal working doc. Fill in [FILL IN] fields before submitting.
> URL: https://cerebralvalley.ai/e/built-with-4-7-hackathon/hackathon/submit

---

## Field 1 — Team Name
Lacunex

---

## Field 2 — Team Members
Benjamin Dysin (benjdy)

---

## Field 3 — Project Name
Lacunex

---

## Field 4 — Selected Hackathon Problem Statement
*(This is a free-text textarea — write your own problem statement)*

Post-incident investigations keep finding the same thing: the signal was there. Someone saw it. Nobody asked the right follow-up question in the moment — so the assumption stayed buried, the plan went ahead, and the incident followed.

The Cloudflare November 2025 outage investigation found that a configuration assumption had been visible in team conversations for months. The Grenfell Tower Inquiry's Phase 2 report (September 2024) named "decades of failure… to act on the information available to them" — warnings raised across countless reviews and ministerial conversations that never anchored long enough to force action. Not because the people were wrong — because the conversations weren't designed to surface what people actually thought across turns, as opposed to what they said in any single formal setting.

The people who run interviews get three things wrong, consistently.

They arrive too early — with a script, with a framework, with the answers they expect to hear. The participant senses this and performs rather than reflects.

They act too late — the synthesis happens the day after the conversation closes, when the signal is cold and the context is gone. Two or more hours of researcher time (transcription, coding, synthesis) per 15-minute interview means insight appears long after the moment when it could have changed the conversation.

They go too shallow — they catch what was said, not what was meant. The hedge ("probably"), the drift ("we *think* customers want…"), the contradiction three turns later — these are the actual data. They disappear in the transcript.

Lacunex fixes all three. The conductor adapts turn-by-turn to what the participant just said. The meta-noticing layer identifies contradictions, hedging, and implied-not-stated beliefs in real time — and the conductor can act on them, within the same conversation, before the window closes. The host's structured extraction fills live during the interview, not after. Both sides leave with something: the host with structured signal, the participant with a reflective takeaway that names what surfaced and what they already had that was relevant.

This problem cuts two ways. Large organisations *can* investigate and choose not to — the friction and cost of running thirty good interviews keeps decisions on intuition. Small councils, science teams, NGOs, and indie projects *would* investigate and can't — the budget for a research moderator isn't there, so the conversation never happens. Lacunex closes both gaps from a different direction: the cost of one structured listen drops enough to make it routine, and the structured signal across a hundred listens becomes legible without a synthesis team.

The thesis is not "a better way to read a transcript." It is: by the time you're reading the transcript, you've already missed the chance to react.

---

## Field 5 — Project Description
*(Describe your project and what problem it solves. 200–400 words.)*

**Lacunex runs goal-directed adaptive interviews with live structured reasoning across turns — eliminating the ~2 hours of post-session transcription, coding, and synthesis that qualitative research literature documents per 15-minute interview.**

Built by a systems analyst who has spent years running stakeholder interviews where the right follow-up question came to mind two days later — when the conversation was cold, the participant was gone, and the spec had already moved on. That gap is everywhere: large organisations with budget hire researchers; everyone else ships anyway. Lacunex closes that gap.

The concrete shape of the saving: a consumer-insights team running 30 founder-investor conversations saves ~60 researcher-hours and gets a comparable structured signal across all 30 — because the brief, not the moderator, is the constant. A civic consultation reaching 100 residents becomes a cohort picture, not 100 idiosyncratic transcripts. A post-incident investigation catches hedges, drift between turn 3 and turn 9, and implied-not-said beliefs *in the moment* — observations that would be invisible in transcript review the next day.

At ~$1–2 per session of structured listening (calibrated, not estimated — see Field 8), a 100-resident consultation costs ~$150 end-to-end with cross-cohort synthesis. The kind of structured listening that today lives inside large research budgets becomes reachable for small councils, science teams, NGOs, and indie projects.

The problem: the most valuable insight in any research process lives between the lines — in what the participant hedged, contradicted from three turns ago, or couldn't quite say. Surveys capture surface-level responses. Even AI tools that analyze transcripts arrive after the conversation closes. The conversation itself is where the insight is at risk.

Lacunex is built on a four-call Opus 4.7 architecture:
- **Conductor** — decides the next move turn-by-turn, using the full session state: objectives, extraction state, stall counter, and meta-notice candidates. Generates the interviewer turn.
- **Meta-Noticing** — an observation-only layer that runs after each participant turn, identifying contradictions, hedging, and implied-not-said signals across turns. Each notice requires ≥2 transcript anchors; shallow observations are rejected before surfacing.
- **Extraction** — schema-bound, updates the host's structured dashboard live *during* the conversation.
- **Takeaway Synthesis** — closes each session with a reflective artifact for the participant, including a section called "what you already have that is relevant" — specific resources in their existing life they hadn't connected to the problem.

Neither side leaves empty-handed. The host gets structured insight *during* the conversation, rendered live in a dashboard. The participant gets a personalized takeaway they can act on.

Three fully wired domain briefs ship — Founder Investment Evaluation, Post-Incident Witness Interview, Civic Consultation — plus a meta-brief: **Brief Designer**, where the platform interviews the host (using the same four-call architecture) to author a new brief, then runs that brief against participants. Recursive dog-food.

Beyond the interview loop: a live host dashboard at `/host/live/[sessionId]` (KV-polled second-screen view), voice input via Groq Whisper large-v3, a replay-validated fixture suite (9 annotated transcripts; 14 cross-turn catches; **0 kill-rule violations**), an adversarial-persona sim harness for offline regression, and a cross-cohort convergence map at `/rounds/[id]/aggregate` (force-directed layout, smoothed-hull cluster halos, Jaccard-weighted edges).

Empirical scale during build: **11-session congestion-charge cohort, 303 participant+host turns, 54 deployed `◆` cross-turn observations, 243 candidate notices considered, 12 patterns + 6 routing recommendations in the cross-cohort aggregate.** Reproducible from `npm run sim`. Full synthesis at [docs/cohort/congestion-charge-2026-04-24.md](docs/cohort/congestion-charge-2026-04-24.md).

**Not a research moderator that delivers overnight reports** (Outset, Listen Labs, Strella — all batch, post-hoc). Not a transcript analyzer (Dovetail, Condens). The distinctive claim: cross-turn structural reasoning that surfaces contradictions and implied assumptions *during* the conversation, not after.

Headline: *Cross-turn reasoning, rendered live. Both sides leave with something.*

---

## Field 6 — Public GitHub Repository
https://github.com/Attius-Digital-Art/lacunex

---

## Field 7 — Demo Video
**[FILL IN — paste YouTube unlisted URL after upload]**

Production v2 — locked storyboard at [DEMO_SCRIPT_v2.md](DEMO_SCRIPT_v2.md). Eleven beats, 2:45 soft cap, voice-only over stills + screen captures. Key beats:

1. **Cohort opener** (0:00–0:25) — convergence map populated; the platform's cross-cohort aggregate surfaces 12 patterns the brief never asked for ("self-censorship to avoid being miscategorised as anti-progress", "preemptive adaptation before policy is live", "the irony of rerouting"). Judges see a force-directed map first; meet a system that *already found* what they'd assume an analyst would still need to look for.
2. **Personal frame** (0:25–0:40) — voice over a still; the builder's lived gap. Two real failure modes: beginners who interview-as-part-of-the-job lack the *skill*; professionals who have it lack the *time/scale*. Lacunex closes both.
3. **Use-case range** (0:40–0:50) — three quick stills with chyrons: civic consultation, clinical pre-treatment values, expert knowledge before retirement.
4. **Sliding split-screen reveal** (0:50–1:00) — animated split lands with persistent corner labels (`PARTICIPANT` / `HOST DASHBOARD · LIVE`) and warm/cool tints, so viewers always know which side is which. VO names what they're watching: a civic consultation about a proposed congestion charge.
5. **Sped-up chat** (1:00–1:15) — `×5` indicator visible; six turns in fifteen seconds; decelerates to 1× and freeze-frames at the focal participant turn.
6. **Cross-turn ◆ + silence drop** (1:15–1:35) — rhetorical question ("How long would a careful reader take to notice that what she just called 'small adjustments' includes moving a medical appointment?") · 2s pause · ◆ panel renders · 5.6 s of music silence · resolution VO at –24 dB.
7. **Letter takeaway** (1:35–1:55) — participant clicks "See your reflection →"; surface morphs from chat to letter view; the verbatim *what surfaced between the lines* pull-quote held; VO names "both sides leave with something."
8. **Architecture flex** (1:55–2:15) — black caption card. Three patterns named — Orchestrator-Workers, Parallelization, Routing — with citation: *"Building Effective Agents" · Schluntz & Zhang · Anthropic Engineering · Dec 2024*.
9. **Surprise A — meta-brief / recursive dog-food** (2:15–2:23) — Brief Designer mid-conversation; the platform interviews the host who designs the next interview. *"Same four calls. All the way down."*
10. **Surprise B — made-up-child quote** (2:23–2:35) — Instrument Serif card with the verbatim cohort-aggregate quote *"The child with asthma is abstract — I made her up to make my point sound bigger than it is"* + small honest disclosure beneath: *from a simulated cohort run · on the real platform.*
11. **Close** (2:35–2:45) — *Lacunex. Built in five days. Open source. lacunex.com — for anyone who needed to listen at scale and didn't have time.*

v1 storyboard preserved unchanged at [DEMO_SCRIPT.md](DEMO_SCRIPT.md) as a fallback only.

---

## Field 8 — Thoughts and feedback on building with Opus 4.7
*(What worked, what surprised you, what you'd want to see changed.)*

**Architecture posture — three of the five patterns from *Building Effective Agents*, running together every turn.** The Conductor is the **Orchestrator-Workers** orchestrator, delegating observation (Meta-Noticing) and structured fill (Extraction) to specialised workers. Meta-Noticing and Extraction execute as **Parallelization** on every participant turn, then both feed the Conductor synchronously. The Conductor itself is **Routing** — it classifies session state and routes to one of five typed move-types (`probe`, `switch`, `deploy_notice`, `anchor_return`, `wrap_up`), each with distinct downstream behaviour. The patterns aren't separate features bolted on; they layer on a single turn. Outside the per-turn loop, three more specialised calls (Takeaway Synthesis, Cross-Cohort Aggregate, Brief Designer) plus one genuine Managed Agent (Claim Verifier) extend the same architectural posture.

**What worked exceptionally well: Opus 4.7 maintains genuine cross-turn memory and applies it.**

The Conductor prompt asks Claude to decide not just "what to ask next" but *"given what was said at turn 4, does what was just said at turn 9 represent growth, contradiction, or avoidance?"* Opus 4.7 consistently answered this correctly — it didn't collapse to recency bias or surface-pattern matching. We put hard validators in the orchestration layer (e.g., reject outputs with two questions in one turn; reject meta-notices that don't cite ≥2 distinct transcript anchors). Across our 9-fixture replay suite (163 annotated turns) plus the 11-session congestion-charge cohort (303 turns), structural-validator retry rates stayed in the low-single-digit percent range.

**Opus 4.7 as bug-finder for its own prompts.** The hard constraints in our prompts (no two questions per turn; every meta-notice must cite ≥2 distinct turn indices; meta-notices must not fire on a single turn in isolation) were tightened by asking Opus to *generate the weakest output that would technically satisfy the prompt*. Opus produced specific failure cases — a meta-notice citing the same anchor twice, a question phrased as a statement+question pair, a probe that mechanically triggered anchor_return without purposive cause. Each example exposed a prompt seam, which we closed. The development loop ("here's the rule — find the violation") is the same cognitive operation the meta-noticing layer performs at runtime ("here are claims across turns — find the ones that don't cohere"). The product and its development reflect the same reasoning pattern.

**Domain-general transferability.** The Post-Incident Witness brief was authored once around six axioms from Loftus's reconstructive-memory research. We then ran it cold against four very different witness personas without changing a line of brief or prompt: a software SRE on a payments near-miss, a 30-year ICU nurse on a patient near-miss, an evasive PM withholding information, and an investigation into possible professional misconduct. The same conductor distinguished routine memory from event memory in the clinical case, named the withholding pattern explicitly in the PM case, and tracked the loss of certainty across 11 turns in the integrity case. Domain knowledge sits in the brief; reasoning is Opus 4.7. The four-call architecture is domain-general.

**What surprised us — beyond the per-turn calls.** The meta-noticing layer — an observation-only call that evaluates cross-turn patterns and must cite ≥2 transcript anchors — produced genuinely non-obvious notices that a simpler model would flatten. Across the 11-session cohort, **54 deployed observations** broke down by type as: implied_not_said (27), contradiction (10), outside_consideration (9), emotional_shift (6), hedging_pattern (2). The most striking single notice fired when a participant said "my granddaughter's asthma is worse in the rush hour" two turns after declaring "this is just another tax on working people" — Opus correctly identified the hedge between stated objection and underlying value, and the conductor anchor-returned to it.

The bigger surprise was at cohort scale. The Civic Consultation brief asks about lived experience, priorities, trust, barriers, adjacent concerns — five named objectives. The cross-cohort aggregate over 11 sessions surfaced **12 patterns**, several of which weren't asked for anywhere in the brief: *"preemptive adaptation before policy is live"* (5 sessions changing routines around a scheme not yet in force), *"dependents as the unvoiced pressure point"* (7 sessions pivoting on a mother-in-law, grandchild, or elderly neighbour the participant was mediating for), *"self-censorship to avoid being miscategorised as anti-progress"* (5 sessions hedging legitimate feedback because raising it felt politically disloyal), *"the irony of rerouting"* (residents creating the congestion the scheme claims to solve, by going around it). One participant admitted on tape: *"The child with asthma is abstract — I made her up to make my point sound bigger than it is"* — meta-honesty the cohort aggregate surfaces verbatim with anchor. These patterns weren't in the brief. The aggregate found them by reading 11 transcripts side-by-side as one corpus.

**What we'd want:** Streaming tool use with partial JSON so the extraction call can update the dashboard incrementally rather than waiting for a full response. The current UX has a short pause while extraction runs; streaming schema-structured output would close that gap.

**On cost — calibrated, not estimated:** Across the 11-session cohort with prompt caching enabled, end-to-end model spend (conductor + extraction + meta-noticing + final takeaway) ran roughly $1–2 per session of 17–35 turns. The cross-cohort aggregate over all 11 transcripts was under $5. The Managed Agent claim verifier (Opus 4.7 reasoning + `web_search`) added ~$0.50–1 per fact-check run with 3–4 web searches. Numbers vary with transcript length and cache-hit rate; we are deliberately not advertising a single "$/turn" headline because session length is the dominant variable and we don't want a cost claim that doesn't survive contact with longer sessions.

---

## Field 9 — Did you use Claude Managed Agents? If so, how?

**Yes — one Managed Agent: the post-session claim verifier.**

The agent is defined in Anthropic's managed-agents plane:

- **`client.beta.agents.create`** — an `Agent` resource named *"Lacunex claim verifier"*, backed by `claude-opus-4-7`, with the built-in `web_search` tool enabled under an `always_allow` permission policy via `agent_toolset_20260401`.
- **`client.beta.environments.create`** — a cloud container environment with unrestricted network, used as the execution substrate for each session.
- **`client.beta.sessions.create`** — a new session per fact-check run, bound to the agent + environment above.
- **`client.beta.sessions.events.send`** — the interview transcript is delivered to the agent as a `user.message` event.
- **`client.beta.sessions.events.stream`** — the session's event bus is streamed back to our route, which forwards each event to the browser over SSE.

The result: when the host clicks "Run agent" on a finished session, the UI renders a live event log — every `agent.tool_use` (the web-search query the agent chose), every `agent.tool_result` (search results returned), every `agent.message` slice as it writes — before the final Fact-Check Report lands. The audience watches the agent work rather than waiting behind a spinner. Typical run: ~37s active container time, 4–5 parallel web searches, one structured report with per-claim verdicts (Supported / Refuted / Partially Supported / Unverifiable) and named source references.

Why post-session instead of in-session: (a) the participant shouldn't feel interrogated mid-conversation; (b) the host benefits from the full transcript context for claim selection; (c) agentic behaviour changes the output qualitatively here — the agent *decides* which claims are worth checking, not just retrieves information. The civic consultation brief surfaces mostly "Unverifiable" (personal experience); the founder brief surfaces verifiable market / competitor / regulatory claims. In a real run against a founder-spike transcript, the agent correctly flagged a "LinkedIn ad prices doubled in Microsoft's Q2 2022 earnings call" claim as Refuted — Microsoft reported LinkedIn revenue growth, not ad prices.

Route: `POST /api/sessions/[id]/research`; event pipeline lives in [`src/lib/managed-agents.ts`](src/lib/managed-agents.ts); the event log component is in the session detail page. Idempotent provisioning script: `npx tsx scripts/spike-managed-agents-e2e.ts` (reuses the Agent + Environment by metadata tag, or creates them on first run; writes IDs to `.env.local`).

**What we considered but chose not to label as an agent:** Our cross-session cohort synthesis feature ("live synthesis over all sessions in a round") is a single Messages-API call over N transcripts — valuable but not a Managed Agent. We walked back an earlier "two agents" framing rather than wrap a one-shot synthesis call in ceremonial agent machinery to pad a count. One honest Managed Agent, with its receipts visible in the UI, was the better claim.

---

## Submission checklist before hitting submit

- [x] Problem Statement (Field 4) — rewritten, two-tier impact framing added (big orgs *won't*, small orgs *can't*)
- [x] Project Description (Field 5) — personal-builder opener + $1–2/session cost-to-impact connector
- [x] Field 8 — three Anthropic patterns named explicitly + Opus-as-bug-finder anecdote + cohort emergent-patterns surprise
- [x] Field 9 — one Managed Agent (claim verifier) wired via `beta.agents` + `beta.environments` + `beta.sessions`, events streamed to UI via SSE; cohort synthesis described as a feature, not relabelled as an agent
- [x] DEMO_SCRIPT_v2.md authored with 11-beat storyboard; v1 preserved as fallback
- [x] Captures re-recorded with arrow cursor + clean dev UI (capture-helpers.ts root-cause bug fixed)
- [x] Open Graph metadata + Twitter card on all routes (was CRITICAL gap from live audit)
- [x] Custom OG image generated at /opengraph-image (1200×630 anchor-web branded card)
- [x] Architecture flex visible on lacunex.com landing page (was HIGH gap from live audit)
- [x] GitHub topics include `claude-opus-4-7`, `agentic`, `interview-platform`
- [x] Stale merged branches deleted (`convergence-map`, `prompt/thinking-aid-frame`)
- [ ] Demo video — record from v2 script; upload to YouTube unlisted; paste URL in Field 7
- [ ] Verify GitHub repo is public, README is judge-readable
- [ ] Trim Field 5 if over form character limit
- [x] Add MAKING_OF.md reference in README so judges can find the build journal
- [ ] Re-read Field 8 for internal terminology; check INTERNAL.md §8 for what's safe public
- [x] Vercel KV: provisioned, all stores backed by KV in production
