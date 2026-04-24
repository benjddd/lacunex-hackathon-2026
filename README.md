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

All four calls run every turn. Meta-Noticing runs in parallel with Extraction; candidate notices are passed to the Conductor which decides whether and how to deploy them. A notice can only be deployed if it cites ≥2 distinct turn indices (enforced in code — not just in the prompt). The Conductor enforces a rate cap (one deploy per three turns) and suppression rules.

At session close, a fifth call — **Takeaway Synthesis** (Opus 4.7) — produces the participant's reflective artifact.

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

The opening turn fires on first render. Type a response, press Enter, watch the dashboard fill in.

---

## Repository layout

```
src/
  app/
    page.tsx                         # / — brief selection + single-session start
    start/page.tsx                   # /start — multi-brief selector + NL brief generator
    host/page.tsx                    # /host — host hub (all sessions/rounds)
    p/[templateId]/page.tsx          # /p/:id — participant interview (split-screen)
    sessions/page.tsx                # /sessions — session list
    sessions/[sessionId]/page.tsx    # /sessions/:id — session detail + claim verifier
    rounds/page.tsx                  # /rounds — round management
    rounds/[roundId]/page.tsx        # /rounds/:id — round detail + cohort synthesis
    api/
      turn/route.ts                  # POST — stateless turn: takes transcript, returns utterance + extraction state
      save-session/route.ts          # POST — persist session to filesystem or KV
      rounds/route.ts                # GET/POST — list and create rounds
      rounds/[roundId]/route.ts      # GET/PATCH — round detail + add session
      rounds/[roundId]/synthesize/route.ts  # POST — trigger cohort synthesis (Managed Agents)
      sessions/[id]/research/route.ts       # POST — trigger claim verification (Managed Agents)
      simulate-participant/route.ts  # POST — dev-only synthetic participant
      generate-brief/route.ts        # POST — NL brief → Template via Opus 4.7
  lib/
    models.ts              # Model IDs — one edit to swap
    types.ts               # Shared types (Turn, Template, Round, ExtractionState, …)
    anthropic.ts           # SDK client singleton
    claude-calls.ts        # callConductor / callExtraction / callMetaNoticing / callTakeaway
    rounds.ts              # Round lifecycle helpers
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

Three briefs fully wired: **Founder Investment Evaluation**, **Post-Incident Witness**, **Civic Consultation**. Rounds + cohort synthesis live. Two Managed Agents wired: claim verifier + live cohort synthesis. NL brief generator (describe your use case in plain language → custom brief).

See [MAKING_OF.md](MAKING_OF.md) for architectural decisions, day-by-day build log, and the calibrated claims about what Opus 4.7 enables. See [PROJECT.md](PROJECT.md) for the live tracker.
