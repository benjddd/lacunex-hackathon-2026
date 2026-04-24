# Lacunex

> **Cross-turn reasoning, rendered live. Both sides leave with something.**

Goal-directed, adaptive interviews at scale. A Host (subject-matter expert) sets interview objectives; the platform runs every conversation live — generating each question from the full session state, producing structured insight *during* the session rather than in an overnight report, and, at session close, handing the participant a reflective takeaway worth keeping.

Built for the Anthropic **"Built with Opus 4.7"** hackathon (April 2026).

→ **[MAKING_OF.md](MAKING_OF.md)** — architecture decisions, day-by-day build log, calibrated claims, what Opus 4.7 enables that smaller models don't.

---

## What it does

A Host describes what they want to learn — objectives, hypotheses, success criteria. The platform:

1. **Runs the interview live.** The Conductor decides each turn from state: probe the current objective, switch, deploy a cross-turn observation, or wrap up.
2. **Catches what a form can't.** A separate Meta-Noticing layer spots contradictions, hedging, implied-not-said, and outside-considerations — each notice must cite at least two turn indices (enforced in code), making the cross-turn claim verifiable on-screen.
3. **Fills a structured insight dashboard *during* the conversation.** Not after.
4. **Hands the participant a reflective takeaway** at session close — including a "what you already have that's relevant" section that names resources already in the participant's life they hadn't connected to the question.
5. **Aggregates across N participants** into a cohort picture — convergent problems, shared assumptions, divergent framings, outliers, and unasked-across-cohort gaps — with routing recommendations ("you should also loop in X about Y").

**What it is NOT** — and where the competitive line actually sits:

- *Not an AI research moderator that ships an overnight report.* (Outset, Listen Labs, Strella all do that — insight is produced during the conversation, on-screen.)
- *Not a post-hoc transcript analyzer.* (Dovetail, Condens ingest transcripts; we produce them — and the structured signal — live.)
- *Not a hiring screener.* (Sapia is scoring-shaped and hiring-only.)
- *Not "Claude with a long system prompt."* A single chatbot can't enforce cross-turn reasoning the way a four-call architecture with turn-anchored notices can.

**Who it's for:** academic qualitative researchers, consumer-insights teams, civic consultation at scale, clinical patient-values elicitation, retiring-expert knowledge capture, post-incident witness interviewing, manager reflection prep.

---

## Architecture

```
Participant speaks
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  Phase 1 (parallel)                                   │
│                                                       │
│  ┌─────────────────────┐  ┌───────────────────────┐  │
│  │  Meta-Noticing      │  │  Extraction           │  │
│  │  Opus 4.7           │  │  Haiku 4.5            │  │
│  │  Spots contradictions│  │  Updates structured   │  │
│  │  hedging, implied-  │  │  insight dashboard    │  │
│  │  not-said across    │  │  in real time         │  │
│  │  turns (≥2 anchors) │  │                       │  │
│  └──────────┬──────────┘  └───────────┬───────────┘  │
│             │ candidate notices        │ new state     │
└─────────────┼──────────────────────────┼──────────────┘
              ▼                          ▼
┌───────────────────────────────────────────────────────┐
│  Phase 2                                              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Conductor · Opus 4.7                           │ │
│  │  Receives notices + updated state               │ │
│  │  Decides: probe / switch / deploy notice /      │ │
│  │           anchor_return / wrap_up               │ │
│  │  Renders the next question in the host's voice  │ │
│  └─────────────────────┬───────────────────────────┘ │
└────────────────────────┼──────────────────────────────┘
                         ▼
              Interviewer speaks
              Host dashboard updates live
```

Three calls run every turn — Meta-Noticing in parallel with Extraction, then the Conductor with candidate notices + updated state. A notice can only be deployed if it cites ≥2 distinct turn indices (enforced in code — not just in the prompt). The Conductor enforces a rate cap (one deploy per three turns) and suppression rules.

At session close, a fourth call — **Takeaway Synthesis** (Opus 4.7) — produces the participant's reflective artifact. A lighter **Takeaway Preview** (Sonnet 4.6) also regenerates every three participant turns, so the reflection the participant can peek at mid-session grows with the conversation.

Beyond the interview loop, three more specialized calls run on their own cadence: **Cross-Cohort Aggregate** (Opus 4.7) across all sessions in a round; **Brief Designer** (Opus 4.7, two-stage: distil + generate) that interviews the Host to author a new brief; and **Claim Verifier**, a Claude **Managed Agent** (Opus 4.7 + built-in `web_search` tool) that runs a full agentic loop on its own container — session events stream to the browser live, so the audience watches the agent decide queries, see results arrive, and write the report. See [src/lib/managed-agents.ts](src/lib/managed-agents.ts).

Everything is one Next.js app. API routes call Claude directly. Session state is client-owned — the UI sends the full transcript with each turn. Simple, serverless-safe, no database.

---

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- `@anthropic-ai/sdk` with prompt caching on system + template blocks
- Client-side session state (no DB for POC)

### Four specialized Claude calls (each doing one job well)

| Call | Model | Runs | Cached blocks | Returns |
|---|---|---|---|---|
| **Conductor** | `claude-opus-4-7` | every Host turn | system (persona + objectives + rules) | JSON: `{reasoning, move_type, move_target, next_utterance}` |
| **Extraction** | `claude-haiku-4-5-20251001` | every Host turn, in parallel with Conductor | system (objectives + schemas) | full live-insight state (non-fatal on failure: prior state is preserved) |
| **Meta-Noticing** | `claude-opus-4-7` | after each substantive participant turn (≥2 prior turns, latest ≥ 40 chars), parallel with Extraction | system (notice types + hints) | JSON array of candidate notices with `transcript_anchors`, `why_cross_turn`, `strength`, `suggested_deploy_language` |
| **Takeaway Synthesis** | `claude-opus-4-7` | once at session end | system (artifact tone + sections) | markdown for the participant's reflective artifact |

Model IDs are isolated in [src/lib/models.ts](src/lib/models.ts) — one edit to swap. **Prompt caching** is on for every system block (stable within a session), so turn-over-turn cost drops to cache rates after turn 1.

Three more specialized calls run outside the per-turn loop — each chosen for the job it's actually doing:

- **Takeaway Preview** (`claude-sonnet-4-6`) — regenerates the participant's reflection every three participant turns so they can peek at it mid-session. Sonnet for speed; the final Opus pass still runs at session close.
- **Brief Designer** (`claude-opus-4-7`, two-stage) — distils the host's design-interview transcript into a prose description, then generates a conforming Template JSON. The platform uses itself to author its own briefs.
- **Cross-Cohort Aggregate** (`claude-opus-4-7`) — per round, produces a 6-pattern-type synthesis (convergent / divergent / shared-assumption / recurring-hedge / outlier / unasked-across-cohort) with verbatim quote provenance.

### Why four calls, not one

A single "do-everything" prompt would be easier to build but worse on every dimension. Each of these has different temperature discipline, different output format, different failure modes we care about:

- **Meta-noticing needs to be conservative.** A combined prompt rewards noticing (it's the visible differentiator) and will over-fire. Isolating it as observation-only lets us tune for precision — and enforce the hard rule that a notice must cite at least two turn indices *and* not plausibly fire on either in isolation.
- **Extraction needs to be mechanical.** Creative Claude is bad Claude for structured schema fill. Separate call = different model (Haiku for speed/cost) + different prompt discipline + non-fatal if it chokes, so the chat keeps flowing.
- **The Conductor's job is strategic**, not observational. Separating noticing out lets the Conductor focus on the decision (next move) and the rendering (next question).
- **Takeaway is a different tone entirely** — reflective, for the participant, not inquisitive. Isolating it lets us hold it to different forbidden-language rules.

---

## Running locally

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Edit .env.local and paste your Anthropic API key.

# 3. Run
npm run dev
# Open http://localhost:3000
```

The landing page is a role chooser: **Host** (create briefs, generate invite links, view rounds), **Participant** (paste an invite code), or **Demo** (see both sides — host dashboard filling live beside the participant chat — in a single window). The demo auto-starts a session on first render so the conductor's opening turn arrives without a click.

---

## Repository layout

```
src/
  app/
    page.tsx                         # / — role chooser (Host / Participant-with-invite / Demo)
    demo/page.tsx                    # /demo — split-screen combined view (auto-starts a session)
    start/page.tsx                   # /start — multi-brief selector + NL brief generator
    host/page.tsx                    # /host — host hub (briefs, invite links, sessions, rounds)
    host/live/[sessionId]/page.tsx   # /host/live/:id — live dashboard; polls /api/sessions/:id/live every 4s so a second device watches fill in real time
    p/[templateId]/page.tsx          # /p/:id — participant interview (mic input, live takeaway preview drawer)
    i/[token]/page.tsx               # /i/:token — resolves an invite; redirects to the bound brief
    sessions/page.tsx                # /sessions — session list
    sessions/[sessionId]/page.tsx    # /sessions/:id — session detail + claim verifier
    rounds/page.tsx                  # /rounds — round management
    rounds/[roundId]/page.tsx        # /rounds/:id — round detail + cohort synthesis
    api/
      turn/route.ts                  # POST — stateless turn: takes transcript, returns utterance + extraction state
      save-session/route.ts          # POST — persist session to filesystem or KV
      invites/route.ts               # POST — create a per-session invite token for a brief
      invites/[token]/route.ts       # GET — resolve an invite token to its brief
      rounds/route.ts                # GET/POST — list and create rounds
      rounds/[roundId]/route.ts      # GET/PATCH — round detail + add session
      rounds/[roundId]/synthesize/route.ts  # POST — cohort synthesis across all sessions in a round
      sessions/[id]/research/route.ts       # POST — claim verification via Claude Managed Agent (SSE)
      sessions/[id]/live/route.ts           # GET — live extraction state (powers /host/live/[sessionId] polling)
      sessions/[id]/generate-brief/route.ts # POST — distil a brief-designer session → generate a new Template (Opus 4.7 ×2)
      takeaway/route.ts              # POST — takeaway preview (Sonnet 4.6) + final (Opus 4.7)
      transcribe/route.ts            # POST — Groq Whisper large-v3 voice-to-text for the mic button
      simulate-participant/route.ts  # POST — dev-only synthetic participant
      generate-brief/route.ts        # POST — NL brief → Template via Opus 4.7
  lib/
    models.ts              # Model IDs — one edit to swap
    types.ts               # Shared types (Turn, Template, Round, ExtractionState, …)
    anthropic.ts           # SDK client singleton
    claude-calls.ts        # callConductor / callExtraction / callMetaNoticing / callTakeaway
    rounds.ts              # Round lifecycle helpers
    invites.ts             # Per-session invite-token generation + resolution
    store-hosted.ts        # KV-backed persistence (Vercel/Upstash or in-memory fallback)
    personas.ts            # Synthetic participant personas (dev only)
    prompts/
      conductor.ts         # Conductor system prompt + JSON parser
      extraction.ts        # Extraction system prompt + JSON parser
      meta-noticing.ts     # Meta-noticing system prompt + JSON parser
  templates/
    founder-product-ideation.json
    post-incident-witness.json
    civic-consultation.json
    brief-designer.json              # A brief the platform runs against the host to author new briefs
  components/              # Shared UI pieces
docs/
  domain/
    memory-science-for-interviewing.md   # Loftus axioms → operational interview rules
    vc-failure-patterns.md               # CB Insights taxonomy + diagnostic probes
    participation-frameworks.md          # Arnstein's Ladder, IAP2, failure modes
  fixtures/
    founder-session-example.json           # 15-turn classic, embedded deployed_notice
    founder-contradiction-pricing.json     # 20-turn, TAM/ARR contradiction + I/they shift
    founder-strong-signal.json             # 14-turn NULL-case: 0 notices fire, by design
    civic-consultation-bike-lane.json      # 18-turn, minimisation_mask + scope_displacement
    civic-consultation-housing-density.json # 22-turn, trust_contradiction + implied_resignation
    post-incident-session-example.json     # 25-turn, clinical near-miss, protective synthesis
    post-incident-factory.json             # 21-turn, manufacturing avoidance + source_monitoring
    post-incident-software-outage.json     # 16-turn, SRE hedging_pattern + emotional_shift
    brief-designer-onboarding.json         # 12-turn, scope_creep + vague_participant
    REPLAY_REPORT.md                       # Regenerated by npm run replay:fixtures
    replay-report.json                     # Machine-readable report
scripts/
  simulate-session.ts      # Drive a synthetic interview against localhost:3000
  eval-noticing.ts         # Evaluate meta-noticing quality against saved sessions
  replay-fixtures.ts       # Validate committed fixtures against D26 kill rule
  validate-templates.ts    # Smoke-check committed briefs have required shape
MAKING_OF.md               # Build journal — architecture, day-by-day, Opus-as-partner
CALENDAR.md                # Hackathon gates (IST)
PROJECT.md                 # Live project tracker
CLAUDE.md                  # Context for AI assistants in this repo
```

---

## Test suite

Two offline suites, runnable without an Anthropic key, wired to `npm run test:suite`:

```
npm run test:suite
# → validate:templates  (4 briefs, strict shape)
# → replay:fixtures    (9 annotated transcripts, D26 kill rule)
```

**Current state** (see [docs/fixtures/REPLAY_REPORT.md](docs/fixtures/REPLAY_REPORT.md) for the generated report):

| Metric | Value |
|---|---:|
| Committed annotated fixtures | **9** covering all 4 templates |
| Total annotated turns | **163** |
| Cross-turn catches validated | **14** |
| Catches with ≥2 distinct anchors | **13** |
| Catches with ≥3 anchors (recurrence) | **5** |
| Kill-rule violations | **0** |
| Null-case fixture (platform correctly silent) | **1** — `founder-strong-signal` |

The replay harness enforces the same three invariants the live meta-noticing layer does (see [D26](PROJECT.md) and [src/lib/prompts/meta-noticing.ts](src/lib/prompts/meta-noticing.ts)): every cross-turn catch must cite real turn indices, anchors must strictly precede the catch turn, and catches whose notice type requires cross-turn evidence must cite ≥2 distinct anchors. `npm run test:suite` exits non-zero on any violation, so new fixtures can't regress the invariant.

Notice types exercised across the suite: `contradiction` (×2), `implied_not_said` (×2), `hedging_pattern`, `emotional_shift`, `avoidance`, `source_monitoring`, `minimisation_mask`, `scope_displacement`, `trust_contradiction`, `implied_resignation`, `scope_creep`, `vague_participant`.

---

## License

MIT. See [LICENSE](LICENSE). Every component of this project is open source, per the hackathon requirement.

---

## Status

Three domain briefs fully wired: **Founder Investment Evaluation**, **Post-Incident Witness**, **Civic Consultation**. Plus **Brief Designer** — a fourth brief the Host runs against the platform itself to author a new interview from scratch; the resulting Template JSON drops straight into the Conductor. Rounds + live cohort synthesis live. One Claude Managed Agent wired: post-session claim verifier (web_search tool, session events streamed to the UI). **Live host dashboard** at `/host/live/[sessionId]` — a second device can watch the Host dashboard fill in real time via KV polling. **Live takeaway preview** on the participant side regenerates every three turns (Sonnet 4.6). **Voice input** via Groq Whisper large-v3 mic button.

See [MAKING_OF.md](MAKING_OF.md) for architectural decisions, day-by-day build log, and the calibrated claims about what Opus 4.7 enables. See [PROJECT.md](PROJECT.md) for the live tracker.
