# CaptainSubtext

> **Cross-turn reasoning, rendered live. Both sides leave with something.**

Goal-directed, adaptive interviews at scale. A Host (subject-matter expert) sets interview objectives; the platform runs every conversation live — generating each question from the full session state, producing structured insight *during* the session rather than in an overnight report, and, at session close, handing the participant a reflective takeaway worth keeping.

Built for the Anthropic **"Built with Opus 4.7"** hackathon (April 2026).

---

## What it does

A Host describes what they want to learn — objectives, hypotheses, success criteria. The platform:

1. **Runs the interview live.** The Conductor decides each turn from state: probe the current objective, switch, deploy a cross-turn observation, or wrap up.
2. **Catches what a form can't.** A separate Meta-Noticing layer spots contradictions, hedging, implied-not-said, and outside-considerations — each notice must cite at least two turn indices (enforced in code) so a judge can verify the "cross-turn" claim on camera.
3. **Fills a structured insight dashboard *during* the conversation.** Not after.
4. **Hands the participant a reflective takeaway** at session close — including a "what you already have that's relevant" section that names resources already in the participant's life they hadn't connected to the question.
5. **Aggregates across N participants** into a cohort picture — convergent problems, shared assumptions, divergent framings, outliers, and unasked-across-cohort gaps — with routing recommendations ("you should also loop in X about Y").

**What it is NOT** — and where the competitive line actually sits:

- *Not an AI research moderator that ships an overnight report.* (Outset, Listen Labs, Strella all do that — insight is produced during the conversation, on-screen.)
- *Not a post-hoc transcript analyzer.* (Dovetail, Condens ingest transcripts; we produce them — and the structured signal — live.)
- *Not a hiring screener.* (Sapia is scoring-shaped and hiring-only.)
- *Not "Claude with a long system prompt."* A single chatbot can't enforce cross-turn reasoning the way a four-call architecture with turn-anchored notices can.

**Who it's for:** academic qualitative researchers, consumer-insights teams, civic consultation at scale, clinical patient-values elicitation, retiring-expert knowledge capture, post-incident witness interviewing, manager reflection prep. The hackathon POC wires one brief end-to-end (Founder Investment Evaluation) with a second Civic / Post-Incident brief shipping Fri.

---

## Architecture (Day 1 slice)

```
Participant speaks
        │
        ▼
┌───────────────────────┐    ┌──────────────────────┐
│  1. Conductor         │    │  2. Extraction       │
│  Decides next move    │    │  Updates dashboard   │
│  + renders utterance  │    │  (in parallel)       │
└─────────┬─────────────┘    └──────────┬───────────┘
          │                              │
          ▼                              ▼
   Interviewer speaks            Host dashboard updates
```

Coming Thu: **Meta-noticing** (observation-only call catching contradictions, hedging, unsaid assumptions) and **Takeaway synthesis** (end-of-session artifact for the participant).

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
| **Meta-Noticing** | `claude-opus-4-7` | every Host turn (coming Thu) | system (notice types + hints) | JSON array of candidate notices with `transcript_anchors`, `why_cross_turn`, `strength`, `suggested_deploy_language` |
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
    api/turn/route.ts      # Stateless turn endpoint — takes full transcript, returns next utterance + new extraction state
    page.tsx               # Split-screen orchestrator
    layout.tsx
    globals.css
  components/
    ChatPane.tsx           # Left panel: transcript + input
    DashboardPane.tsx      # Right panel: objective cards, progress, key quotes, themes
  lib/
    anthropic.ts           # SDK client singleton
    models.ts              # Model IDs — one place to swap
    templates.ts           # Template registry
    types.ts               # Shared types
    claude-calls.ts        # callConductor / callExtraction
    prompts/
      conductor.ts         # System prompt + output parser
      extraction.ts        # System prompt + output parser
  templates/
    founder-product-ideation.json
CALENDAR.md                # Hackathon gates (IST)
PROJECT.md                 # Live project tracker
CLAUDE.md                  # Context for AI assistants in this repo
```

---

## License

MIT. See [LICENSE](LICENSE). Every component of this project is open source, per the hackathon requirement.

---

## Status

This is a hackathon project in active development. Day-1 milestone: conductor + extraction loop running text-only on the Founder Product Ideation template. See [PROJECT.md](PROJECT.md) for the live tracker and [CALENDAR.md](CALENDAR.md) for upcoming gates.
