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

The Cloudflare November 2025 outage investigation found that a configuration assumption had been visible in team conversations for months. Boeing's 737 MAX Senate testimony revealed that engineers and pilots had raised MCAS concerns that never made it into the structured review rooms. Not because the people were wrong — because the conversations weren't designed to surface what people actually thought, as opposed to what they said in a formal setting.

The people who run interviews get three things wrong, consistently.

They arrive too early — with a script, with a framework, with the answers they expect to hear. The participant senses this and performs rather than reflects.

They act too late — the synthesis happens the day after the conversation closes, when the signal is cold and the context is gone. Two or more hours of researcher time (transcription, coding, synthesis) per 15-minute interview means insight appears long after the moment when it could have changed the conversation.

They go too shallow — they catch what was said, not what was meant. The hedge ("probably"), the drift ("we *think* customers want…"), the contradiction three turns later — these are the actual data. They disappear in the transcript.

Lacunex fixes all three. The conductor adapts turn-by-turn to what the participant just said. The meta-noticing layer identifies contradictions, hedging, and implied-not-stated beliefs in real time — and the conductor can act on them, within the same conversation, before the window closes. The host's structured extraction fills live during the interview, not after.

The thesis is not "a better way to read a transcript." It is: by the time you're reading the transcript, you've already missed the chance to react.

---

## Field 5 — Project Description
*(Describe your project and what problem it solves. 200–400 words.)*

**Lacunex runs goal-directed adaptive interviews with live structured reasoning across turns.**

The problem: the most valuable insight in any research process lives between the lines — in what the participant hedged, contradicted from three turns ago, or couldn't quite say. Surveys capture surface-level responses. Even AI tools that analyze transcripts arrive after the conversation closes. The conversation itself is where the insight is at risk.

Lacunex is built on a four-call Opus 4.7 architecture:
- **Conductor** — decides the next move turn-by-turn, using the full session state: objectives, extraction state, stall counter, and meta-notice candidates. Generates the interviewer turn.
- **Meta-Noticing** — an observation-only layer that runs after each participant turn, identifying contradictions, hedging, and implied-not-said signals across turns. Each notice requires ≥2 transcript anchors; shallow observations are rejected before surfacing.
- **Extraction** — schema-bound, updates the host's structured dashboard live *during* the conversation.
- **Takeaway Synthesis** — closes each session with a reflective artifact for the participant, including a section called "what you already have that is relevant" — specific resources in their existing life they hadn't connected to the problem.

Neither side leaves empty-handed. The host gets structured insight *during* the conversation (not after), rendered live in a dashboard. The participant gets a personalized takeaway they can act on.

One brief runs reliably across many participants — so insights are comparable, not a pile of idiosyncratic transcripts. Three fully wired briefs ship with the platform: Founder Investment Evaluation (investor/founder), Post-Incident Witness Interview (facilitator/witness), and Civic Consultation (facilitator/resident).

Self-serve from day one — no enterprise contract, no demo call required. One brief, many conversations: run the same brief across any number of participants and get comparable structured signal, not a pile of idiosyncratic transcripts.

**It is not a research moderator that delivers overnight reports** (Outset, Listen Labs, Strella — all batch, all post-hoc). It is not a transcript analyzer (Dovetail, Condens). The distinctive claim: cross-turn structural reasoning that detects contradictions and implied assumptions turn-by-turn — rendered live on screen during the conversation, not after. Transcription + coding + synthesis for a 15-minute interview averages 2+ hours of researcher time; we eliminate that step entirely by producing structured output while the conversation is still happening.

Headline: *Cross-turn reasoning, rendered live. Both sides leave with something.*

---

## Field 6 — Public GitHub Repository
https://github.com/Attius-Digital-Art/captainsubtext

---

## Field 7 — Demo Video
**[FILL IN — record before Sunday; YouTube or Loom URL]**

Demo storyboard is in INTERNAL.md §2. Key beats:
1. Host sets a goal in plain language (0:00–0:15)
2. Live interview with dashboard filling (0:15–0:45)
3. Meta-notice surfaces a contradiction → participant reacts (0:45–1:30)
4. Contradiction caught across turns (1:30–2:15)
5. Bilateral artifacts on screen together (2:15–2:40)
6. Broader-use hint + Managed Agents mention + tagline (2:40–3:00)

---

## Field 8 — Thoughts and feedback on building with Opus 4.7
*(What worked, what surprised you, what you'd want to see changed.)*

**What worked exceptionally well: Opus 4.7 maintains genuine cross-turn memory and applies it.**

The Conductor prompt asks Claude to decide not just "what to ask next" but *"given what was said at turn 4, does what was just said at turn 9 represent growth, contradiction, or avoidance?"* Opus 4.7 consistently answered this correctly — it didn't collapse to recency bias or surface-pattern matching. We put hard validators in the orchestration layer (e.g., rejects outputs with two questions in one turn), and Opus 4.7 respected the schema reliably enough that the retry rate was under 5%.

**What surprised us:** The meta-noticing layer — an observation-only call that evaluates cross-turn patterns and must cite ≥2 transcript anchors — produced genuinely non-obvious notices that a simpler model would flatten. It noticed when a participant called something their "biggest pain" in turn 3 and then didn't mention it again for 6 turns — and labeled this "strategic avoidance" rather than forgetting. That's a reasoning move we didn't expect to be reliable.

**What we'd want:** Streaming tool use with partial JSON so the extraction call can update the dashboard incrementally rather than waiting for a full response. The current UX has a short pause while extraction runs; streaming schema-structured output would close that gap.

**On cost:** The four-call architecture with prompt caching runs in 3–7 seconds per turn at a cost of roughly $0.04–0.08 per participant turn. For a 15-turn session, that's under $1.20 — acceptable for professional research use cases, and dramatically cheaper than 45 minutes of a trained interviewer's time.

---

## Field 9 — Did you use Claude Managed Agents? If so, how?

**Yes.**

After a session ends, the host can trigger a post-session claim-verification agent from the session detail page. The agent:

1. Reads the full interview transcript
2. Calls Claude Opus 4.7 with the `web_search_20250305` tool enabled
3. Claude autonomously identifies 3–5 verifiable factual claims made by the participant
4. Runs web searches for each claim
5. Synthesizes a structured **Fact-Check Report**: for each claim — verdict (Supported / Refuted / Partially Supported / Unverifiable) + evidence summary with named sources
6. Appends a "Coverage note" explaining which claim types were not checkable (opinions, personal anecdotes, internal data)

This is implemented at `POST /api/sessions/[id]/research`. The web search tool is a server-side tool — Anthropic's infrastructure handles search execution; our orchestration layer handles the agentic loop, result extraction, and persistence.

We chose post-session claim verification over in-session real-time fact-checking because: (a) the participant shouldn't feel interrogated mid-conversation; (b) the host benefits from the full transcript context for claim selection; (c) it's the highest-leverage place where agentic behavior changes the output qualitatively (not just "finds information," but "decides which claims are worth checking and why").

In the civic consultation brief, most session content is personal experience and thus "Unverifiable" — the agent correctly identifies and labels this. In the founder brief, claims about market size, competitor behavior, and process pain are frequently verifiable — and the agent finds and cites supporting or contradicting industry data.

---

## Submission checklist before hitting submit

- [x] Problem Statement (Field 4) — rewritten, free-text textarea confirmed
- [x] Project Description (Field 5) — drafted
- [x] Managed Agents (Field 9) — two agents: claim verifier + live cohort synthesis
- [ ] Demo video — record with OBS + Playwright session; upload to YouTube/Loom; paste URL in Field 7
- [ ] Verify GitHub repo is public, README is judge-readable
- [ ] Trim Field 5 if over form character limit
- [x] Add MAKING_OF.md reference in README so judges can find the build journal
- [ ] Re-read Field 8 for internal terminology; check INTERNAL.md §8 for what's safe public
- [ ] Vercel KV: provision KV database in Vercel dashboard, add KV_REST_API_URL + KV_REST_API_TOKEN env vars, redeploy
