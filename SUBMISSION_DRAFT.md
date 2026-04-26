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

Across product research and consumer insights, civic consultation at scale, clinical patient-values elicitation, post-incident witness interviewing, retiring-expert knowledge capture, academic qualitative research, and manager reflection prep, the people who run interviews get three things wrong, consistently.

They **arrive too early** — with a script, with a framework, with the answers they expect to hear. The participant senses this and performs rather than reflects.

They **act too late** — synthesis happens the day after the conversation closes, when the signal is cold and the context is gone. PubMed 2025 puts the per-fifteen-minute-interview cost at roughly 1.5 hours of transcription + 0.5 hours of coding *before* synthesis even begins, with another ~1 hour to integrate findings — so insight appears two-plus hours after the moment when it could have changed the conversation.

They **go too shallow** — they catch what was said, not what was meant. The hedge ("probably"), the drift ("we *think* customers want…"), the contradiction three turns later — these are the actual data. They disappear in the transcript.

Lacunex fixes all three. The Conductor adapts turn-by-turn to what the participant just said. A separate Meta-Noticing layer identifies contradictions, hedging, and implied-not-said beliefs in real time, with each notice required to anchor on ≥2 distinct turn indices — and the Conductor can act on them, within the same conversation, before the window closes. Structured extraction fills the host dashboard live during the interview, not after. Both sides leave with something: the host with structured signal, the participant with a reflective takeaway naming what surfaced and what they already had that was relevant.

The problem cuts two ways. Large organisations *could* run thirty good interviews and rarely do — the cost and friction keep decisions on intuition. Smaller councils, science teams, NGOs, and indie projects *would* and can't — the budget for a research moderator isn't there, so the conversation never happens. Lacunex closes both gaps: structured listening becomes cheap enough to be routine, and the cohort signal across a hundred listens becomes legible without a synthesis team.

The thesis: by the time you're reading the transcript, you've already missed the chance to react.

---

## Field 5 — Project Description
*(Describe your project and what problem it solves. 200–400 words.)*

**Cross-turn reasoning, rendered live. Both sides leave with something.**

Lacunex runs goal-directed adaptive interviews where structured insight is produced *during* the conversation, not in an overnight report. A Host (subject-matter expert) defines objectives; the platform conducts every turn live, surfaces cross-turn observations the moment they cohere, and at session close hands the participant a reflective takeaway worth keeping.

Built by a systems analyst, ten years in. Lacunex closes two gaps real-world interviewing never closes: beginners — analysts, PMs, anyone for whom interviewing is *part* of the job — don't yet know how to run a round well; experienced researchers do, but lack the time to interview enough people for long enough.

A four-call Opus 4.7 architecture runs every turn:
- **Conductor** — decides the next move from session state and renders the interviewer's turn.
- **Meta-Noticing** — observation-only; spots contradictions, hedging, and implied-not-said across turns. Every notice must cite ≥2 distinct transcript anchors (enforced in code, not just in prompt).
- **Extraction** (Haiku 4.5) — schema-bound; fills the host's live insight dashboard turn-by-turn.
- **Takeaway Synthesis** — a reflective artifact for the participant, including a "what you already have that is relevant" section.

Mapped against Anthropic's *Building Effective Agents* (Schluntz & Zhang, Dec 2024): **three of the five patterns layer on a single turn — Orchestrator-Workers, Parallelization, Routing.**

Three domain briefs ship — **Founder Investment Evaluation**, **Post-Incident Witness**, **Civic Consultation** — plus **Brief Designer**, where the platform interviews the host to author a *new* brief using the same four calls. Recursive dog-food.

**Audiences exercised during build:** VC and angel investors evaluating founders; city officials running civic consultations; SREs, safety officers and clinical QI managers conducting post-incident interviews; clinicians eliciting patient values; tacit-knowledge capture from retiring experts; consumer-insights teams; qualitative researchers; managers preparing for high-stakes conversations.

Empirical scale, on a **simulated 11-resident cohort** run against the Civic Consultation brief on the real platform: **303 turns, 54 deployed `◆` cross-turn observations from 243 considered, 12 cohort patterns, 6 routing recommendations.** Cost with prompt caching: **~$1–2 per session**, under $5 for the cross-cohort aggregate — putting a 100-resident consultation at ~$150 end-to-end.

**Not an overnight research moderator** (Outset, Listen Labs, Strella ship next-day reports). **Not a transcript analyser** (Dovetail, Condens ingest transcripts that already exist). **Not "Claude with a long system prompt"** — a single chatbot can't enforce cross-turn reasoning the way four calls with code-enforced turn anchors can.

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

**Why Opus 4.7 specifically — calibrated against Haiku 4.5 and Sonnet 4.6 during development.** Conductor and Meta-Noticing prompts were tested on all three. **Haiku** converged too fast — marked objectives complete after one relevant answer, lost the thread past ~3 turns, missed meta-notice candidates entirely. **Sonnet** followed briefs competently but missed the cross-turn class of observations (the *"said X in turn 3, implied not-X in turn 9"* pattern), and anchor-returned mechanically rather than purposively. **Opus 4.7** caught the hedge, reached back to the earlier turn, and deployed the meta-notice at the right moment while writing a question that sounded natural — four cognitive operations on a single turn, with the model's stated reasoning visible in the dashboard's reasoning strip. On meta-noticing the gap was starker still: Sonnet produced *"participant seems uncertain"*; Opus 4.7 produced *"participant stated 'we've validated this with 20 customers' in turn 4, then used 'we think customers want' language in turns 8–12 — the frame shifted from validated to hypothetical after the market-size question."*

**What worked exceptionally well: Opus 4.7 maintains genuine cross-turn memory and applies it.**

The Conductor prompt asks Claude to decide not just "what to ask next" but *"given what was said at turn 4, does what was just said at turn 9 represent growth, contradiction, or avoidance?"* Opus 4.7 consistently answered this correctly — it didn't collapse to recency bias or surface-pattern matching. We put hard validators in the orchestration layer (e.g., reject outputs with two questions in one turn; reject meta-notices that don't cite ≥2 distinct transcript anchors). Across our 9-fixture replay suite (163 annotated turns) plus the 11-session congestion-charge cohort (303 turns), structural-validator retry rates stayed in the low-single-digit percent range.

**Opus 4.7 as bug-finder for its own prompts.** The hard constraints in our prompts (no two questions per turn; every meta-notice must cite ≥2 distinct turn indices; meta-notices must not fire on a single turn in isolation) were tightened by asking Opus to *generate the weakest output that would technically satisfy the prompt*. Opus produced specific failure cases — a meta-notice citing the same anchor twice, a question phrased as a statement+question pair, a probe that mechanically triggered anchor_return without purposive cause. Each example exposed a prompt seam, which we closed. The development loop ("here's the rule — find the violation") is the same cognitive operation the meta-noticing layer performs at runtime ("here are claims across turns — find the ones that don't cohere"). The product and its development reflect the same reasoning pattern.

**Domain-general transferability.** The Post-Incident Witness brief was authored once around six Loftus reconstructive-memory axioms, embedded as distilled `domain_context` rather than RAG. We ran it cold against four witness personas — a software SRE on a payments near-miss, a 30-year ICU nurse on a patient near-miss, an evasive PM withholding information, and a professional integrity investigation — without changing a line of brief or prompt. The same conductor distinguished routine memory from event memory in the clinical case, named the withholding pattern explicitly in the PM case ("you keep handing the knowing-part back to someone else, and I'd like to stay with you" — turn 12), and tracked progressive loss of certainty across 11 turns in the integrity case. Domain knowledge sits in the brief; reasoning is Opus 4.7. The four-call architecture is domain-general.

**What surprised us — beyond the per-turn calls.** The meta-noticing layer — an observation-only call that evaluates cross-turn patterns and must cite ≥2 transcript anchors — produced genuinely non-obvious notices that a simpler model would flatten. Across the 11-session cohort, **54 deployed observations** broke down by type as: implied_not_said (27), contradiction (10), outside_consideration (9), emotional_shift (6), hedging_pattern (2). The most striking single notice fired when a participant said "my granddaughter's asthma is worse in the rush hour" two turns after declaring "this is just another tax on working people" — Opus correctly identified the hedge between stated objection and underlying value, and the conductor anchor-returned to it.

The bigger surprise was at cohort scale. The Civic Consultation brief asks about lived experience, priorities, trust, barriers, adjacent concerns — five named objectives. The cross-cohort aggregate over 11 simulated-resident sessions surfaced **12 patterns**, several of which weren't asked for anywhere in the brief: *"preemptive adaptation before policy is live"* (5 sessions changing routines around a scheme not yet in force), *"dependents as the unvoiced pressure point"* (7 sessions pivoting on a mother-in-law, grandchild, or elderly neighbour the participant was mediating for), *"self-censorship to avoid being miscategorised as anti-progress"* (5 sessions hedging legitimate feedback because raising it felt politically disloyal), *"the irony of rerouting"* (residents creating the congestion the scheme claims to solve, by going around it). One participant admitted on tape: *"The child with asthma is abstract — I made her up to make my point sound bigger than it is"* — meta-honesty the cohort aggregate surfaces verbatim with anchor. These patterns weren't in the brief. The aggregate found them by reading 11 transcripts side-by-side as one corpus. (The cohort is synthetic — adversarial personas exercising the platform — but the aggregate call is the same Opus 4.7 path that runs against real participants.)

**What we'd want:**
1. **Streaming structured output across the SDK.** Partial JSON streamed from the Extraction call would let the host dashboard fill incrementally rather than land in a single beat. Today there's a short pause every turn; schema-validated streaming would close that gap.
2. **Stable schema enforcement on free-form structured output.** Tool-use schemas are enforced; free-form JSON outputs (our extraction state, meta-notice candidates, conductor decisions) we still validate ourselves with a retry-on-malformed loop. Native end-to-end schema enforcement on `messages.create` would let us delete that retry layer entirely.
3. **First-class session-state primitive.** Our Conductor receives the full session state assembled in application code each turn. A native "session memory" the workers could read and write — without round-tripping through our orchestration — would simplify the four-call architecture without changing what it does.

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

**The same agent runs at two scales.** Per-session, it fact-checks claims from a single transcript. Cohort-level (added Day 6), it operates across all sessions in a round and identifies *shared* factual claims — the "Stockholm 22%" statistic that surfaced in 4 of 11 sessions, the "£50 daily charge" recollection that 7 sessions repeated all wrong in the same direction. Three Playwright scenarios validate the path on hosted Vercel: single-session, cohort-level shared-claim consolidation, and the SSE event stream rendering live in the round detail UI. Same `runClaimVerifierAgent()` primitive; what changes is how the harness composes input transcripts.

Why post-session instead of in-session: (a) the participant shouldn't feel interrogated mid-conversation; (b) the host benefits from the full transcript context for claim selection; (c) agentic behaviour changes the output qualitatively here — the agent *decides* which claims are worth checking, not just retrieves information. The civic consultation brief surfaces mostly "Unverifiable" (personal experience); the founder brief surfaces verifiable market / competitor / regulatory claims. In a real run against a founder-spike transcript, the agent correctly flagged a "LinkedIn ad prices doubled in Microsoft's Q2 2022 earnings call" claim as Refuted — Microsoft reported LinkedIn revenue growth, not ad prices.

Route: `POST /api/sessions/[id]/research`; event pipeline lives in [`src/lib/managed-agents.ts`](src/lib/managed-agents.ts); the event log component is in the session detail page. Idempotent provisioning script: `npx tsx scripts/spike-managed-agents-e2e.ts` (reuses the Agent + Environment by metadata tag, or creates them on first run; writes IDs to `.env.local`).

**What we considered but chose not to label as an agent:** Our cross-session cohort synthesis feature ("live synthesis over all sessions in a round") is a single Messages-API call over N transcripts — valuable but not a Managed Agent. We walked back an earlier "two agents" framing rather than wrap a one-shot synthesis call in ceremonial agent machinery to pad a count. One honest Managed Agent, with its receipts visible in the UI, was the better claim.

---

## Submission checklist before hitting submit

- [x] Problem Statement (Field 4) — realigned to v2 video spine ("too early / too late / too shallow" + residents/patients/witnesses trio); Cloudflare/Grenfell hooks dropped (only ever lived in v1 script)
- [x] Project Description (Field 5) — within 200–400 word spec; opens with README headline; cohort cited as **simulated**; $1–2/session cost inlined (no forward reference); four-call list compact; explicit **audiences served** list added (8 categories matching the README "Who it's for")
- [x] Field 8 — three Anthropic patterns named explicitly + **Haiku/Sonnet/Opus failure-mode comparison** (concrete evidence for *why* Opus 4.7) + Opus-as-bug-finder anecdote + cohort emergent-patterns surprise; cohort flagged as simulated personas; "what we'd want" expanded to 3 items; domain-general paragraph names the four post-incident persona transfers + verbatim conductor turn
- [x] Field 9 — one Managed Agent (claim verifier) wired via `beta.agents` + `beta.environments` + `beta.sessions`, events streamed to UI via SSE; **two-scale operation surfaced** (per-session + cohort-level shared-claim consolidation, Day-6 extension); cohort synthesis described as a feature, not relabelled as an agent
- [x] Numbers consistent across F4/F5/F8: 11 sessions / 303 turns / 54 ◆ deployed / 243 candidates / 12 patterns / 6 routing recs; F4 hours claim aligned to MAKING_OF's PubMed 2025 source ("~1.5h transcription + ~0.5h coding before synthesis even begins"); F5 omits the hours number to avoid drift with video
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
