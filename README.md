# CaptainSubtext

> Goal-directed, adaptive interviews. The Host sets *what* to learn; the platform decides *how* the conversation unfolds, turn by turn.

Built for the Anthropic **"Built with Opus 4.7"** hackathon (April 2026).

---

## What it does

A Host (subject-matter expert) defines interview objectives — hypotheses to probe, things to learn, success criteria. The platform then runs the conversation live: it generates each interviewer turn based on the full session state, extracts structured insight into a live dashboard as the conversation unfolds, and (end of session) produces a reflective takeaway artifact the participant would actually want to keep.

**What it is not:**

- **Not a questionnaire.** No pre-written question list. Every conversation is different because the platform picks questions based on state, not a script.
- **Not post-hoc research.** The structured insight is produced *during* the conversation, not extracted afterwards from a transcript.
- **Not a chatbot with a system prompt.** A goal-aware conductor, a mechanical extraction layer, a separate observation-only meta-noticing layer (adding Thu), and a closing synthesis call — each doing one job well.

**Who it's for (eventually):** academic qualitative researchers, consumer-insights teams, early-stage founders, retiring-expert knowledge capture, civic consultations. The hackathon POC ships with a single fully-wired template (Founder Product Ideation).

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

### Model mapping

| Call | Model |
|---|---|
| Conductor | `claude-opus-4-7` |
| Extraction | `claude-haiku-4-5-20251001` |
| Meta-noticing (Thu) | `claude-opus-4-7` |
| Takeaway (Thu) | `claude-opus-4-7` |

Isolated in [src/lib/models.ts](src/lib/models.ts) — one edit to swap.

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
