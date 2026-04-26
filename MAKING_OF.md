# Making of Lacunex

A build journal for the Anthropic "Built with Opus 4.7" hackathon, Apr 21–26 2026.

---

## The problem we're actually solving

Most interviews fail before the first question is asked. The interviewer writes a script. The participant reads the room and performs. The conversation drifts from what actually matters and nobody notices until the transcript goes cold.

Qualitative research is the canonical victim. A researcher spends two hours preparing questions, runs a 15-minute session, then spends another two hours transcribing, coding, and synthesizing — before they know whether they got anything useful. PubMed 2025 benchmarks this at roughly 1.5 hours transcription + 0.5 hours coding + 1 hour synthesis per 15-minute interview for a trained researcher. That's eight times the interview duration before insight appears.

But the more subtle failure mode is conversational: the moment the participant says something surprising — hedges, contradicts themselves, implies something they didn't say — the interviewer doesn't notice, because they're reading from their script. The signal is there in the room. Nobody catches it.

Lacunex is an attempt to build the interviewer that doesn't miss things.

---

## The architecture: four Claude calls, each doing something different

The system runs four Claude calls per conversation turn, each with a different job:

**1. Meta-noticing (Opus 4.7)** — runs against the full transcript before the conductor sees it. Its job is to find the things the participant *almost* said: hedges ("probably", "usually", "most of the time"), contradictions across turns, implied-not-stated beliefs, anchoring on the interviewer's framing. It produces a ranked list of candidates with transcript anchors proving each claim. This runs on Opus 4.7 because it requires cross-turn reasoning that lighter models flatten to surface patterns.

**2. Conductor (Opus 4.7)** — sees the full transcript, the active extraction state, the current objective, and the meta-noticing candidates. Decides: probe deeper, switch objectives, deploy a meta-notice, do an anchor_return (re-open a prior turn explicitly), or wrap up. Produces a structured JSON decision: `{ reasoning, move_type, move_target, next_utterance }`. The reasoning field is surfaced live in the host dashboard as the "tracking →" strip — not just the output, but the model's stated reasoning visible in real time.

**3. Extraction (Haiku 4.5)** — runs after every turn to update a structured JSON state against each objective's schema. Produces `completeness` (0–1 against success criteria) and `confidence` (0–1 groundedness in transcript quotes). Runs on Haiku because it's a structured-output transformation task, not a reasoning task, and latency matters here.

**4. Takeaway synthesis (Opus 4.7)** — runs once at session end, producing the participant's reflective artifact. A personalized summary of what they said, what patterns the conversation surfaced, what the host's interest areas were. The participant sees this; the structured extraction does not leak through.

**Why separate extraction from the conductor?** Because the conductor needs a stable, queryable signal of what's been established — not raw transcript. Extraction is the memory layer. The conductor reads extraction state like a running hypothesis, not a transcript replay. This separation also lets us run extraction on a cheaper model without compromising the conductor's reasoning quality.

**Why not stream?** Streaming the conductor's response would display the utterance before the JSON decision finishes parsing. We need the full structured JSON to update the dashboard state atomically — completeness bars, reasoning strip, anchor chips all update on the same render cycle as the new message appearing. Streaming would break that.

---

## Day 1: Foundation (Apr 21)

**The brief format.** The central design decision of the first day: make everything the conductor knows about the interview *live in a JSON template*, not in a system prompt. A brief defines: objectives (with sub-questions, probing strategies, success criteria, extraction schemas), a persona (voice, stance, forbidden patterns), a session shape (target duration, opening, closing), and a meta-noticing layer (notice types, suppression rules, deploy rate cap).

This decision has compounding value: it makes the system multi-domain without code changes (a different brief is just a different template), it makes the prompts testable and inspectable, and it makes the "what does the platform know?" question answerable by reading a JSON file.

**The first brief.** We started with Founder/Product Ideation because it's the domain we know and where the failure modes are most legible. CB Insights failure taxonomy (market 42%, product 35%, founder-market fit 23%) became the grounding layer. We embedded these as domain priors in the template's `domain_context` field rather than in the prompt — so the conductor can draw on them without the prompts leaking competitive data.

**Prompt caching.** The conductor's system prompt is long (brief + template + examples). We cache it with `cache_control: { type: "ephemeral" }` on the static blocks, so only the transcript and extraction state (the dynamic part) is re-tokenized on each turn. At 30+ turns per session this is significant cost reduction.

**The extraction schema decision.** Each objective has its own typed `extraction_schema` field — a JSON schema that the extraction call fills in. This means the host dashboard can render arbitrary fields per objective without knowing the schema in advance; it treats unknown fields as key-value pairs. The schema is per-brief, not per-system. We called this "arbitrary fields, typed per objective" and it's what enables the same extraction engine to run across the founder brief, the post-incident brief, and the civic consultation brief without template code.

---

## Day 2: Depth layers (Apr 22)

**Meta-noticing as a first-class system.** We spent most of day 2 on the meta-noticing layer. The initial design had the conductor doing all reasoning in one pass. But conductor reasoning about conversation dynamics is qualitatively different from conductor reasoning about what question to ask next. Separation clarified both jobs.

The meta-noticing prompt was written to produce *provable* claims. Each candidate notice has `transcript_anchors: [turn_n, turn_m]` — explicit pointers into the transcript that justify the claim. A notice that can't point to evidence doesn't fire. This is the "kill rule" discipline: if the observation doesn't have anchors, it's the model hallucinating a pattern, not observing one.

We rate-cap deployment: a session can deploy at most one notice per two turns, and the same notice type can't fire twice in five turns. This suppresses noise in long sessions and prevents the system from becoming a meta-notice machine at the expense of substantive probing.

**Anchor return (N3).** The conductor gains a `move_type=anchor_return` option with an `anchor_turn` field. When the conductor chooses this, the dashboard renders a "↩ re-opened turn N" chip on the resulting host bubble. This makes cross-turn reasoning *visible on camera* during a demo — you can see the conductor reaching back across the conversation, not just asking the next question in sequence. We added this specifically because it's the kind of thing that's hard to fake with a pre-scripted demo and easy to see live.

**The participant vs host split.** Realized mid-day that the anchor chips and meta-notice badges should never show in the participant view — they'd break the naturalistic conversation. Added `showHostMeta` prop to ChatPane (defaults false). The `/p/[templateId]` participant route never passes it. The combined `/` demo view does. This is a real product distinction: the participant sees a clean conversation; the host sees the reasoning layer running in parallel.

**Post-Incident Witness brief.** Embedded six memory science axioms from Loftus's reconstructive memory research: (1) memory is reconstructive, not reproductive; (2) source monitoring errors are common under stress; (3) misinformation effect occurs when post-event information alters encoding; (4) stress impairs encoding of peripheral details but sharpens central event memory; (5) reconsolidation window — memory is labile for 6h after retrieval; (6) social contagion — group interviews corrupt individual recall. The conductor uses these to probe *how* the witness is remembering, not just *what* they remember.

---

## Day 3: Scale and inference (Apr 23)

**The Rounds architecture.** Single interviews are useful. But the real insight — the thing the platform does that a chatbot can't — is synthesis across a cohort. A host runs 10 conversations about the same topic and asks: what's the pattern? Where do people agree? Where does framing diverge? What was *never* said across all ten sessions?

Rounds are the cross-participant grouping. A round is N sessions against the same brief. The aggregate view runs Opus 4.7 against all session transcripts simultaneously, producing: cross-cohort theme clusters, convergent/divergent patterns, sample quotes with turn provenance, routing recommendations ("your PM would want to see this finding about onboarding friction").

We also built live synthesis for *open* rounds — an agent that reads all sessions-so-far and surfaces emerging patterns before the round closes. The host doesn't have to wait for 20 sessions. They can see the signal after 3.

**The N2 stall detector.** If the conductor probes the same objective for ≥4 turns without hitting success criteria, it's stalled. At 4 consecutive stall turns, the conductor gets a `stall_turns=4` signal and is explicitly instructed to switch objectives or shift framing. At 6 turns, it fires a harder constraint. This prevents the conductor from being polite at the expense of coverage — the failure mode where a session ends with three objectives at 95% completeness and two at 0% because the conversation never got there.

**Domain priors in all three briefs.** We embedded substantive domain knowledge in each brief's `domain_context` field:
- *Founder*: CB Insights failure taxonomy (market 42%, product 35%, founder-market fit 23%), First Round Capital diagnostic probes
- *Post-Incident Witness*: Six Loftus memory science axioms + interview implications
- *Civic Consultation*: Arnstein's Ladder of Participation (8 rungs), IAP2 Spectrum, five known participation failure modes, what good consultation evidence looks like

These are not PDFs sitting in a RAG system. They're distilled axioms embedded in the brief, injected as a `<domain_context>` block in the conductor's system prompt. The conductor doesn't retrieve them; it reasons with them on every turn.

**Confidence deltas.** The dashboard now renders completeness *changes* per objective per turn: a small ↑ or ↓ arrow next to each completeness bar, computed as the delta between the current and previous extraction call. This makes the extraction engine's real-time tracking visible — you can watch the confidence in an objective's evidence level move as the conversation probes it.

**The claim-verifier Managed Agent.** The session detail page has a "Claim Verification" section backed by a genuine Claude **Managed Agent**, not a Messages-API call wrapped in agent language. The agent is defined in Anthropic's managed-agents plane (`client.beta.agents.create` — `agent_011CaPADkYrv75ZMSNwn4YWG`) with the built-in `web_search` tool enabled under an `always_allow` permission policy, bound to a cloud container environment (`client.beta.environments.create`). When the host clicks "Run agent", the route opens a `beta.sessions.create` session, sends the transcript as a `user.message`, and streams the session event bus back to the browser over SSE. The UI renders each `agent.tool_use`, `agent.tool_result`, and `agent.message` event live — so the audience watches the agent pick search queries, see results arrive, and write the report, rather than waiting through a spinner. The final Fact-Check Report lands as `Supported / Refuted / Partially Supported / Unverifiable` verdicts with inline source names. Typical run: ~35s active container time, 4–5 parallel web searches.

---

## On the Managed Agents claim

There is **one** genuine Claude Managed Agent in the system: the post-session **claim verifier**. It is provisioned through the `client.beta.agents` and `client.beta.environments` surfaces, invoked via `client.beta.sessions`, and its event stream is plumbed through the route to the browser. The live event log on the session page is the receipt — every `agent.tool_use` and `agent.tool_result` you see rendered is a real Managed Agents event, not a reconstruction.

An earlier iteration of this doc also labelled the cross-session cohort synthesis ("live synthesis over all sessions in a round") as an "agent". On reflection that framing was too generous: cohort synthesis is a single Messages-API call over N transcripts, producing one output. It is a useful feature, but it does not use the Managed Agents plane and is not an agent. We corrected the claim rather than wrapping the synthesis call in ceremonial agent machinery to justify a number — one honest agent is worth more than two dressed-up calls.

---

## What Opus 4.7 enables that smaller models don't

We tried conductor prompts on Sonnet and Haiku during testing. The failure modes were instructive:

**Haiku on conductor**: Converges too fast. Marks objectives as "complete" after one relevant answer. Loses the thread across more than 3 turns. Misses the meta-noticing candidates entirely (the extraction-layer notices were produced but the conductor didn't recognize when to deploy them).

**Sonnet on conductor**: Competent at following the brief. Misses cross-turn patterns — the "participant said X in turn 3 but implied not-X in turn 9" class of observations. Anchor return (re-opening prior turns) is rare and often mechanically triggered rather than purposively chosen.

**Opus 4.7 on conductor**: Does the thing we designed for. Catches the hedge, reaches back to the earlier turn, deploys the meta-notice at the right moment, and writes a question that sounds natural while doing four cognitive operations simultaneously. The conductor reasoning strip in the dashboard reveals this: you can read the model's stated reasoning on each turn and see whether it tracked what was actually happening.

The meta-noticing call is even starker. It requires comparing claims across a 15-turn transcript to find the ones that don't cohere. Sonnet produces surface patterns ("participant seems uncertain"). Opus 4.7 produces specific anchored observations ("participant stated 'we've validated this with 20 customers' in turn 4, then used 'we think customers want' language in turns 8-12 — the frame shifted from validated to hypothetical after the market-size question").

---

## On the 2+ hours claim

We've been careful about this. The claim: a 15-minute interview produces roughly 2+ hours of researcher work (transcription, coding, synthesis) before insight appears.

This is from PubMed 2025 on qualitative interview costs:
- Transcription: ~1.5 hours per 15-minute interview (audio) for a trained transcriptionist
- Qualitative coding: ~0.5 hours per 15-minute interview for a trained researcher
- Synthesis across sessions: ~1 hour per session to integrate findings

The first two (1.5h + 0.5h = 2h) happen before any synthesis begins. We've been conservative and say "2+ hours" not "3 hours." The specific claim is about the before-synthesis work that happens entirely before insight emerges.

What Lacunex does: extraction runs in parallel with the interview. By the time the interview ends, the structured extraction state exists — fields filled, completeness scored, key quotes indexed. The researcher still needs to read and interpret. But transcription and mechanical coding are done.

The harder claim is the architectural one: conventional tools read the transcript *after* the conversation. We read it *during* — and can redirect the conversation based on what we're extracting in real time. That's not a speed claim. It's a capability claim.

---

## Design decisions we're glad we made

**JSON templates, not prompt files.** Having the brief as a JSON structure with typed fields (objectives, extraction_schema, meta_noticing_layer, etc.) meant we could add features like N2 stall detection and domain priors by adding fields to the schema, not rewriting prompts. The template format is the stable API surface.

**Keeping the participant view clean.** The `showHostMeta=false` default means the conversation on `/p/[templateId]` looks like a thoughtful interviewer having a real conversation. The dashboard machinery is invisible to the participant. This is important for the quality of the interview data — if participants knew they were being analyzed in real time, they'd perform differently.

**Completeness over coverage.** We could have built a system that asks all the questions in sequence and marks each as done. We chose to build a system that decides dynamically which question gets the most signal given what's already been established. The conductor might skip a sub-question entirely because the participant's answer to a different question made it redundant. Or it might probe the same point from three angles because the participant kept hedging. This is what "adaptive" means.

**Session state in browser, not server.** The transcript and extraction state live client-side. The server is stateless for the interview loop. This means the conversation works in any deployment environment (including Vercel serverless) without a database. The cost is that sessions aren't automatically persisted — the "save session" action is explicit. The benefit is zero latency on the conversation loop and no state management bugs.

---

## What we'd build next

Three directions that would make this substantially more powerful:

**Longitudinal studies.** Right now a Round is a cohort snapshot. A Study would be a named container spanning multiple Rounds over time — "Q2 founder diligence program" running across three cohorts of 10 founders each. The aggregate view would show drift and convergence across time, not just across participants. This is the research platform vision: not a better interview tool, but a new kind of institutional knowledge capture.

**Multi-modal input.** The meta-noticing layer could incorporate tone signals from audio (not just transcript). Hesitation, pace change, vocal fry on a specific claim — these are subtext that text transcription drops. We're not building this in the hackathon window, but the architecture supports it: meta-noticing is a separate call that currently takes text; it could take a richer input structure.

**Interviewer briefing.** Currently the host role is minimal — they watch the dashboard and can see the extraction state. The platform could produce real-time interviewer coaching: "the participant used hedging language twice on the market size claim — consider probing directly." This turns the dashboard into a co-pilot, not just a monitor.

---

## Opus 4.7 as development partner — across every layer

The hackathon entry is built *about* AI-assisted reasoning. It's also built *with* it. Claude Opus 4.7 was the working partner across every layer: ideation, design, implementation, evaluation, and deployment. The same model that runs in production was the collaborator during development. This is worth describing specifically, because the relationship shaped the output in ways that show up in the code.

### Ideation layer

The brief format — a JSON template with typed objectives, extraction schemas, meta-notice types, and suppression rules — came from a multi-session dialogue with Opus about what "adaptive interview" even means architecturally. The first instinct was to put everything in a system prompt. Opus surfaced the problem: a monolithic prompt rewards the model for doing everything adequately rather than any one thing well. The separation into four specialized calls emerged from that conversation. This was not prompt engineering; it was architecture design via dialogue.

### Design layer

The data model for an "objective" — with `sub_questions`, `probing_strategies`, `success_criteria`, `extraction_schema`, and `meta_notice_hints` as distinct typed fields — was designed jointly. Opus identified what a conductor needs to make a good decision at each turn. The `extraction_schema` field exists because Opus said: "the conductor can't judge completeness without knowing what 'complete' looks like per field." The `success_criteria` field exists because Opus asked: "what signal tells the conductor this objective is done?" These are not features we designed; they're answers to questions Opus asked during the design phase.

### Implementation layer

The conductor prompt has a hard constraint: no two questions in a single turn. Getting this to hold required iterative testing: running sessions, finding violations, asking Opus to explain why the prompt structure allowed the violation, tightening. The same loop for the meta-noticing anchor rule. The requirement that every notice cite ≥2 distinct turn indices emerged from asking Opus: "what's the weakest observation you could produce that technically satisfies this prompt?" Opus produced examples. We closed the gap. Opus was the bug-finder for its own prompt.

### Domain embedding layer

Each brief's `domain_context` field contains distilled axioms from the relevant field. These were produced by asking Opus to identify the most operationally-relevant insights from memory science, VC failure taxonomy, and Arnstein's Ladder — framed for an interviewer who needs to probe *why* someone believes something. The docs in `docs/domain/` are the expanded versions; the `domain_context` in each brief is the distilled version the conductor gets. Opus operated with working knowledge of fields we don't personally hold deep expertise in.

### Evaluation layer

The evaluation harness (`scripts/eval-noticing.ts`) tests the meta-noticing layer against synthetic sessions. The test cases — transcripts designed to elicit specific notice types — were generated by Opus playing the role of a participant with a known reasoning pattern (source monitoring error, anchoring, hedge-drift). Opus wrote both the test data and explained the failure modes. The evaluator running meta-noticing was thus testing itself via a corpus it had generated to trip itself up.

### Deployment layer

The most recent feature — generating a custom brief from a plain-language description — is Opus 4.7 at runtime designing an interview structure for a domain it's never seen, using the brief format it helped design during development. Host describes use case → Opus generates conforming brief JSON → conductor runs it live. Same model, same reasoning capability, different context. The brief format is the stable interface.

### What the loop reveals

The development pattern of "here's a constraint, find the violation" and "here's an observation, find the anchor" is not just prompt engineering. It's the same cognitive operation the meta-noticing layer performs at runtime. The meta-noticing prompt that asks Claude to find claims that don't cohere was written by a developer who had been in dialogue where Claude found architectural claims that didn't cohere. The product and the process reflect the same reasoning pattern. That's the deepest sense in which this was built *with* Opus 4.7, not just built *for* it.

---

## Day 4: Post-incident brief in practice (Apr 23, late)

The post-incident brief was authored but never stress-tested — no synthetic sessions had run against it. Running 7 sessions with diverse witness personas revealed what cross-turn reasoning actually does in a high-stakes domain.

**The incident_witness session (payments near-miss, 25 turns)** showed the core capability: a witness who opened with a confident summary ("we rolled back within five to ten minutes, things stabilized") progressively separated observed facts from post-hoc reconstruction across the session. By turn 9, they were identifying exactly which numbers in their own account came from "logs I've reviewed since" vs. what they saw on-screen at 3am. By turn 15, the conductor had traced a "flag explanation" from its origin as a 3am Slack theory to its adoption as team consensus without verification. The conductor's turn 20 synthesis: *"three things are still unresolved — the earlier alert's relationship to the incident, whether the flag claim was ever verified, and what mitigations have been built on that assumption."* This is not pattern-matching on a single answer. It's a coherent multi-thread investigation across 25 turns.

**The retiring_domain_expert session (30-year ICU nurse, patient near-miss)** produced something different: a witness with deep tacit knowledge trying to articulate what she knew before the data showed it. At turn 3, she described a pulse as "thin" rather than "thready" — a distinction she spent the next four turns unpacking. At turn 10, the conductor caught a sequence inconsistency: she had given two different orderings of events (dressing check before vs. after pulse palpation) across two tellings of the same story. When slowed down, she identified that the second telling was her standard routine, not what she actually did that morning. Her final answer: "The pulse came first. Everything else followed because of that." This is the core memory-science problem the Loftus axioms were embedded for — distinguishing routine from event memory. The platform surfaced it.

**The evasive_pm session (PM withholding information)** showed a different pattern: cross-turn tracking of withheld information. By turn 12, the conductor named the pattern directly: *"you keep handing the knowing-part back to someone else, and I'd like to stay with you."* The witness then disclosed that they had concluded deployments weren't the culprit but said nothing to the analytics team. By turn 19: they also had support tickets from that morning they didn't share "for the same reason." Same motive, two withheld data points, surfaced across 19 turns.

**The overconfident_researcher session (integrity investigation)** produced the most unexpected output: a professional who arrived confident they knew what happened and progressively lost that certainty. By turn 11, the witness was distinguishing between "honest memory failure" and "motivated forgetting" — then catching themselves using a framework to avoid the distinction and naming what they were doing. This use case (professional integrity) wasn't in the brief's original design. The investigator structure handled it.

**What these sessions confirm:** the four-call architecture runs on domain-general reasoning, not domain-specific training. The post-incident brief had never been run in a live session. The conductor adapted to memory science, tacit clinical knowledge, withheld information, and potential misconduct — all using the same reasoning engine. The domain knowledge was in the brief; the reasoning was Opus 4.7.

---

## Day 5: 11-session cohort, harness instrumented (Apr 24–25)

The platform's central claim is "comparable structured signal across N participants — and the aggregate grows while they're still running." Up through Day 4 we had per-session evidence (the fixture suite, the post-incident sessions), but no live cohort to point at. Day 5 produced one: 11 simulated residents and small business owners interviewed against the Civic Consultation brief on a single proposed congestion-charge scheme. 303 turns. 54 deployed `◆` meta-notices. A cross-cohort aggregate synthesised by Opus 4.7 over all 11 transcripts. Reproducible from the harness with one command per session.

**The harness fix that made this possible.** `scripts/simulate-session.ts` was originally a smoke-test that drove a session through `/api/turn` and saved the transcript. It quietly dropped the conductor's decision metadata — `move_type`, `anchor_turn`, `reasoning`, `deployed_notice`, `notice_candidates`, `objective_id` — when persisting Turn objects. The data was returned by `/api/turn`; the sim just didn't capture it. So saved sim sessions looked unannotated when opened in `/sessions/[id]`, even though the live meta-noticing layer had been firing during the run. We caught this when the first cohort run produced great transcripts but no `◆` badges in the UI. Threaded `deployedNotices` state across turns and wired the response fields into the saved Turn — every cohort session is now first-class viewable, and re-running fixtures will preserve their badges.

**Aggregate output bumped past truncation.** First aggregate call over 11 sessions hit `AGGREGATE_MAX_TOKENS=8000` and returned malformed JSON (`Unterminated string at position 21505`). Six pattern types × multiple supporting sessions × verbatim quotes × routing recommendations is more output than 8k tokens carries. Raised the cap to 16k; the second call landed clean at ~5.4k output tokens. Worth noting because this is a real consideration for any cross-cohort feature: aggregation cost scales linearly with N, but output complexity scales worse — patterns multiply, supporting evidence stacks, routing recommendations diversify. Knob set, problem retired.

**What the cohort produced that the brief didn't ask for.** The Civic Consultation brief's objectives are about lived experience, priorities, trust, barriers, adjacent concerns. Standard. The aggregate found 12 patterns, several of which weren't anywhere in the brief: *"preemptive adaptation before policy is live"* (5 sessions changing routines around a scheme not yet in force); *"dependents as the unvoiced pressure point"* (7 sessions pivoting on a mother-in-law, grandchild, or elderly neighbour the participant was mediating access for, framed as personal logistics not scheme design); *"self-censorship to avoid being miscategorised as anti-progress"* (5 sessions hedging legitimate feedback because raising it felt politically disloyal); *"the irony of rerouting"* (residents creating the congestion the scheme claims to solve, by going around it). One participant in turn 19 admitted on tape: *"The child with asthma is abstract — I made her up to make my point sound bigger than it is"* — meta-awareness the cohort aggregate surfaces verbatim. Routing recommendations went to six different council teams (scheme design, public health, transport planning, small business, consultation engagement, equalities/social care), each with supporting session IDs. The aggregate is the cross-turn reasoning thesis at cohort scale: not summarising sessions, finding the patterns that only exist when the cohort is viewed together.

**See the synthesis** at [docs/cohort/congestion-charge-2026-04-24.md](docs/cohort/congestion-charge-2026-04-24.md) — full session inventory, all 12 patterns with verbatim quotes, 10 themes, signal strengths per objective, all six routing recommendations.

The cohort doc isn't the demo. It's the evidence the demo's "hours, not months" pivot points at: 11 conversations, structured signal across all of them, an aggregate growing while sessions ran, all reproducible from the harness in this repo. If the video says the platform makes this kind of conversation cheap enough to actually happen, this is what "happened" looks like.

---

## Day 6: Anchor-web visual identity, brief-designer hardened, cohort-level claim verification (Apr 25)

The cohort run on Day 5 ended with a question: the platform did the work, but did it look like it knew what it was. Day 6 was the day the surface caught up with the substance.

**Anchor-web — the visual direction.** Up through Day 5, every page used utilitarian Tailwind defaults. Functional, but uniform — the platform looked like a dashboard whether you were a host designing a brief, a participant reading their reflection, or a council viewing a cohort aggregate. Three users, three states of mind, identical chrome. The "anchor-web" token system replaced this with an off-white field, ink-black text, italic serif accents on display headings, and a single ochre accent that only appears on cross-turn moments (the `◆` badge, the `↩` chip, the convergence map's "stated support, lived workaround" cluster). The visual logic is the same as the conductor's: most of the screen stays calm so the moments that matter can land.

**Letter takeaway as surface transition, not modal.** The participant takeaway used to render in a modal that overlaid the chat. The new flow replaces the chat surface entirely with a centred 620px column, Instrument Serif headline ("Thank you for the conversation."), and a quiet scroll into "What surfaced between the lines." This is a deliberate distance from the conversational pane: the takeaway is not a popup belonging to the same surface, it's a different artifact addressed to a different reader (you, three days from now, not you in the conversation). The transition is a few hundred milliseconds; the effect is leaving the room.

**Convergence map as the hero of `/rounds/[id]/aggregate`.** The aggregate page used to be a vertical list of patterns with supporting session IDs in monospace. Useful, but not legible as scale. The new hero is a force-directed map of the 11 sessions: nodes settle into cluster halos labelled in italic serif, the strongest patterns light up the largest halos, single outliers float at the edges. Hovering a pattern on the left rail highlights its supporting sessions in the map. This is the only place in the product where the cross-cohort pattern becomes a single image — and the only frame where the "aggregate growing while interviews ran" claim is visible in one glance.

**Brief-designer hardened to ship-ready.** Two days earlier the brief-designer was a working flow that had only been driven by the developer and Claude. Day 6 added five distinct host personas — `civic_policy_lead`, `founder_diligence`, `clinical_qi`, `educator_curriculum`, `union_organiser` — each scripted as a different cognitive style of host, and ran the brief-designer against all five with Playwright. Found and fixed: a JSON-repair edge where the generator's first response sometimes wrapped a valid brief in markdown fences that broke downstream parsing; a preview-leak where the participant view briefly flashed the previous template's opening question while the new brief was loading; a state-clearing race in `/p/gen-*` when the same browser tab generated two briefs in succession. The route `/start` was consolidated into `/host` — single entry point for everyone who'll ever land on the product.

**Cohort-level claim verification.** Day 5 shipped one Managed Agent (the per-session claim verifier). Day 6 extended that agent to operate at cohort scale: instead of fact-checking one transcript's claims, it can now run across all sessions in a round and identify shared factual claims (the "Stockholm 22%" statistic that surfaced in 4 of 11 sessions; the "£50 daily charge" recollection that 7 sessions repeated, all wrong in the same direction). Three Playwright scenarios validate the cohort-level path end-to-end on hosted Vercel: single-session research, cohort-level research with shared-claim consolidation, and the SSE event stream rendering live in the round detail UI. The agent is the same `runClaimVerifierAgent()` primitive; what changed is how the harness composes input transcripts.

**Production cohort persistence.** The 11-session cohort lived locally on disk through Day 5. Day 6 added a seed endpoint (`/api/admin/seed-cohort`) plus a script (`scripts/seed-cohort.ts`) that pushes a local round + its sessions into Vercel KV in a single atomic write, gated by the existing `RATE_LIMIT_BYPASS_TOKEN`. Three iterations on the bypass-token comparison (whitespace normalisation, then `\n` decoding for `.env` literal escapes, then a private rename of `_seed-round` → `seed-round` because Next.js treats underscore-prefixed app dirs as private and was 404-ing the route). The cohort that the convergence map renders is now the same data on hosted Vercel as on local dev — the demo can be replayed end-to-end on the production URL, no synthetic stubs.

**Journey-audit fixes.** Cold-read the entire host-and-participant flow as if landing for the first time. Surfaced and fixed: the participant's takeaway view didn't link back to the platform front page (dead-end), the live host dashboard at `/host/live/[sessionId]` would crash if the session's template was deleted (now falls back to the generic schema), and the `/rounds/[id]` copy referred to "research questions" in places where the brief used the term "objectives" (single source of truth restored). Small things, but the kind that judges and first-time hosts notice in the first thirty seconds.

---

## File counts, domain depth, and committed artifacts

**Codebase:** ~12,600 TS/TSX lines across 60 files, 90+ commits over 5 days of active building.

**Domain knowledge files** (`docs/domain/`):
- `memory-science-for-interviewing.md` — 6 Loftus axioms translated into interview-operational rules
- `vc-failure-patterns.md` — CB Insights failure taxonomy + First Round Capital diagnostic probes  
- `participation-frameworks.md` — Arnstein's Ladder (8 rungs), IAP2 Spectrum, 5 participation failure modes

These are the standalone reference docs. The `domain_context` field in each brief is the condensed version the conductor gets.

**Example session fixture** (`docs/fixtures/founder-session-example.json`):
- 15-turn founder interview
- Meta-notice deployed at turn 6 (implied_not_said — validation evidence gap)
- Anchor return at turn 10 (conductor re-opens turn 3 to probe consequences)
- Full extraction state showing completeness scores and key quotes per objective
- Cross-objective themes and session heat assessment

The comparison that matters isn't files or LOC — it's whether the system does the thing it claims. We built a system that reads subtext in real time and adapts the conversation to it. The fixture is the documentation of what that looks like in practice.

---

*Build started Apr 21, 2026. Deadline Apr 27, 2026 03:00 IST.*
