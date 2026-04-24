# CLAUDE.md — Context for AI coding assistants

Read this first every session.

## What this repo is

**Lacunex** — Anthropic "Built with Opus 4.7" hackathon entry (Apr 21–26, 2026). A platform for goal-directed, adaptive interviews. A Host defines objectives; the platform runs the conversation live (not a pre-written script), extracts structured insights for the Host, and produces a reflective takeaway for the participant.

## Key docs in this repo

- [PROJECT.md](PROJECT.md) — live tracker: timeline, decisions, open questions, submission checklist. **Update this whenever scope or decisions change.**
- [CALENDAR.md](CALENDAR.md) — **read this at every session start.** Milestones and gates by IST datetime. If we're within 4h of a gate, surface it in your first response.
- [INTERNAL.md](INTERNAL.md) — **gitignored** strategy notes (judging posture, positioning, naming). Read for context, never leak content from this file into the public repo or commits.
- `tmp/files_extracted/*.md` — original scoping docs from a prior Claude session. **These are thinking material, not a spec.** Do not cite them as gospel; re-evaluate any claim against current reality. Not committed.

## Hard constraints to internalize

1. **Deadline:** Sun 2026-04-26 20:00 EST = Mon 2026-04-27 03:00 IST. Every hour counts.
2. **Open source:** every component (code, prompts, config) must be MIT-licensed and publishable. No proprietary bundles.
3. **Built entirely during the hackathon:** do not copy in pre-existing code. Design notes from Apr 21+ are allowed (in-window).
4. **The thesis:** the platform wins when it does something a regular chatbot can't — adaptive decision-making across turns, meta-noticing (contradictions/hedging/implied-not-said), and producing structured output *during* (not after) the conversation.

## Stack (locked)

- Next.js 15 (App Router) + TypeScript + Tailwind, single repo, deployed to Vercel.
- Anthropic SDK with prompt caching on system + template + examples.
- No database for POC — session state lives in memory per browser tab.

## Model mapping (initial — re-verify availability before wiring)

| Call | Model |
|---|---|
| Meta-noticing | `claude-opus-4-7` |
| Conductor | `claude-opus-4-7` |
| Extraction | `claude-haiku-4-5` |
| Takeaway | `claude-opus-4-7` |

Isolate model IDs in one config module so swapping is one edit.

## Working norms for this repo

- **Re-evaluate docs rather than follow blindly** — the prior scoping docs were written at a Jan 2026 cutoff; check claims against what's actually available now (especially voice APIs, model IDs).
- **Update PROJECT.md when decisions change.** That file is the source of truth on timeline and status.
- **Keep anything positioning/judging/strategic out of the public repo** — it belongs in `INTERNAL.md` or session conversation, not in README or code comments.
- **Commit early and often** — maintain a clean, timestamped commit trail.
- Commit messages: short imperative present-tense summary, explain the *why* when non-obvious.

## Not relevant here

Ignore any advice to add auth, DB, multi-tenancy, template editors, or mobile polish — explicitly out of scope. See PROJECT.md §4 D3/D9.
