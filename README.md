# The VC Brain

Sourcing → Screening → Diligence → Decision. A data- and AI-first system that
takes a human investor from first signal on a founder to a confident $100K
check decision within 24 hours.

Out of scope by design: portfolio monitoring, follow-on, fund ops, exit.

## Why this exists

Most founder-screening tools either fabricate confidence they don't have or
quietly penalize founders with no funding history and no network — the two
things a pre-seed / first-check investor should care about least. This
project is built around three deliberate constraints instead:

- **Cold-start scoring is a first-class path, not an afterthought.** A
  founder with zero identity signal (no funding, no follower count, no
  pedigree) is scored on process — shipping cadence, completion rate,
  response to public critique, technical writing depth — with an honestly
  wide confidence interval, never a flat penalty for thin data.
- **Scores never collapse into one number.** Founder / Market /
  Idea-vs-Market ship as three independent, unaveraged axes, each with its
  own interval and trend. A single blended score hides exactly the
  disagreement an investor needs to see.
- **Every claim traces to a source, and every score ships its own
  uncertainty.** Trust Score is per-claim (data volume × cleanliness ×
  signal agreement), not per-company. Missing data is flagged explicitly
  ("Cap table: not disclosed") — never fabricated.

## System overview

Three services, talking over plain HTTP — only one of them is this repo's
core app, the other two are separate processes you start independently:

```
┌─────────────────────────────────────────────────────────────────┐
│  web/  (this repo) — Next.js 15 / React 19                      │
│                                                                   │
│  Orchestration · Memory layer · Scoring · Dashboard              │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ HTTP               │ HTTP                │ HTTP
        ▼                    ▼                    ▼
┌───────────────┐   ┌──────────────────┐   ┌────────────────────┐
│ Diligence      │   │ swarm/           │   │ ElevenLabs         │
│ service        │   │ (this repo)      │   │ text-to-speech     │
│ (external,     │   │ Multi-agent      │   │                    │
│ not in repo)   │   │ Ollama sim       │   │                    │
└───────────────┘   └──────────────────┘   └────────────────────┘
```

- **`web/`** — the orchestration layer, the Memory layer, all scoring, the
  agentic sourcing tools, and the dashboard UI. Runs fully offline in mock
  mode with zero external dependencies.
- **External diligence service** (not part of this repo, see
  `diligence/README.md`) — document-analysis engine: knowledge graph, Red
  Flag Score, Absence Detection, a rule-based Dealbreaker Scanner, and a
  signal log. Reached only via `web/lib/diligence-bridge.ts`.
- **`swarm/`** (this repo, but a separate process — see `swarm/README.md`) —
  a real multi-agent simulation that runs entirely against your own local
  Ollama instance: a fixed roster of 29 named analyst personas plus a
  25-to-155-strong "reviewer swarm" debate a deal's bull/bear scenarios.
  Reached via `web/lib/swarm-bridge.ts`; falls back to a deterministic mock
  feed when `SWARM_BASE_URL` is unset. Full roster below.

Every external touchpoint is optional and independently guarded: no key or
no base URL means that one source is skipped, never that anything fails.
`VCBRAIN_MOCK=1` disables every network call at once for fully offline demos.

## Data flow — one deal, start to finish

```
                POST /api/source
             { founderName, companyName, githubUsername?, xHandle?, deckMarkdown? }
                        │
                        ▼
        ┌───────────────────────────────┐
        │ agent/crew/pipeline.ts          │
        │  sourceAndScreenDeal            │
        └───────────────────────────────┘
                        │
        ┌───────────────┴────────────────────────────────────────┐
        │  agent/tools/founder-enrichment.ts — fan out in parallel │
        │                                                          │
        │   GitHub (commits, repos)     agent/tools/github.ts      │
        │   HN / Product Hunt launches  agent/tools/launches.ts    │
        │   Personal / company website  agent/tools/website.ts     │
        │   X (shipping + critique-response, official API v2)      │
        │                                agent/tools/x.ts           │
        │   arXiv papers                agent/tools/papers.ts      │
        │   Patents (PatentsView)       agent/tools/patents.ts     │
        │   Tavily web pulse ×3 (founder traction, market sizing,   │
        │   product/customer signal)    agent/tools/tavily.ts      │
        └───────────────────────────────────────────────────────┘
                        │  every hit -> Claim tied to a Source
                        ▼
        synthesize a markdown "dossier"  ──►  diligence service
                                                POST /api/ma/upload
                        │
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │ diligence-bridge.ts: runWarroom + scanDealbreakers      │
        │  -> Red Flag Score, traffic light, critical findings   │
        └───────────────────────────────────────────────────────┘
                        │
                        ▼
        claims bucketed per axis (classifyClaim)
                        │
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │ lib/scoring/three-axis.ts::computeThreeAxisScore        │
        │   Founder · Market · Idea-vs-Market — independent,      │
        │   never averaged. Falls back to lib/scoring/cold-start.ts│
        │   when a founder has zero identity signal.              │
        └───────────────────────────────────────────────────────┘
                        │
                        ├──► lib/scoring/trust-score.ts — per-claim
                        │      {dataVolume, dataCleanliness, signalAgreement}
                        │
                        ├──► lib/scoring/channel-priors.ts — Bayesian
                        │      prior hit-rate for the sourcing channel itself
                        │
                        ├──► lib/thesis-engine.ts::evaluateThesisFit
                        │      -> deal.stage: screening | diligence
                        │
                        ├──► lib/validator-agent.ts — a second, independent
                        │      pass over the same evidence, catching internal
                        │      contradictions before anything ships
                        │
                        ├──► lib/traceability.ts — every axis conclusion
                        │      cites the claims behind it, and bridges into
                        │      the diligence service's own signal log
                        │      (FOUNDER_MOMENTUM, TRACTION_SIGNAL,
                        │      CONTRADICTION_FLAG)
                        │
                        ▼
        ┌───────────────────────────────────────────────────────┐
        │ lib/memory/store.ts::updateMemory — the only place      │
        │  this deal lives after the call returns                 │
        │                                                          │
        │  lib/memory/founder-score.ts::strengthenFounderScore     │
        │   — SM-2-inspired spaced-repetition analogue: repeated    │
        │   corroboration across applications narrows the interval  │
        │   and grows an "ease factor"; contradiction widens it and │
        │   resets repetitions. Persistent — never a fresh          │
        │   calculation, never resets to zero.                       │
        └───────────────────────────────────────────────────────┘
                        │
                        ▼
        lib/self-validation.ts::logPrediction — logs the prediction
        now so it can be diffed against real announced outcomes later

  ─────────────────────────────────────────────────────────────────
  Downstream, on demand:

  PATCH /api/screen { dealId }   -> re-run Screening gate on new evidence
  POST  /api/memo    { dealId }  -> lib/memo-generator.ts
                                     (5 mandatory sections + optional sections
                                      that only render when evidence exists;
                                      gaps flagged via detectAbsences, never
                                      fabricated) -> deal.stage: decision_ready
  POST  /api/simulation           -> lib/swarm-bridge.ts
                                      (swarm/'s 29-agent + reviewer-swarm debate)
  POST  /api/momentum-plan        -> lib/momentum-plan.ts (Tavily pulse x1 +
                                      think()) — a channel-by-channel action
                                      plan targeting a founder's weakest signal
  POST  /api/pulse                -> agent/tools/tavily.ts direct passthrough
                                      (used by the dashboard's live-search box)
  GET   /api/discover/nlq         -> lib/discover.ts + generateJSON() — turns a
                                      free-text query ("robotics PhDs in Boston")
                                      into structured Discover filters
  POST  /api/voice/briefing       -> lib/voice-briefing.ts (Claude) + ElevenLabs TTS
                                      (30-second spoken partner briefing)
  POST  /api/voice/ask            -> lib/voice-briefing.ts (Claude) + ElevenLabs TTS
                                      (spoken Q&A grounded only in Memory data)
  GET   /api/deals[?id]           -> decision-ready queue / deal detail
  GET   /api/trust?founderId=     -> per-claim Trust Score
  GET   /api/traceability?dealId= -> Agentic Traceability log
  GET/POST /api/validate          -> self-validation harness
  GET/POST /api/discover          -> lib/discover.ts (stateless candidate search)
  GET   /api/events               -> lib/events.ts (hackathons/demo days via Devpost)
  GET/POST /api/digest            -> lib/digest.ts (monthly digest preview)
  GET   /api/alerts               -> lib/memory/store.ts scan — surfaces red-flag
                                      and new-claim alerts for the dashboard banner
  GET   /api/system-status        -> reports mock-vs-live mode per integration
                                      (backs the dashboard's System Ribbon)
  GET   /api/memory-explorer      -> capped raw read of the Memory layer (debug/ops)
```

## The swarm agent roster

`swarm/` (this repo, run as its own process against your local Ollama
instance — see `swarm/README.md`) drives every simulation through two
distinct populations, not one:

1. **29 named analyst agents** (`swarm/agents.py`) — a fixed roster with a
   real name, an emoji, and a one-line role. Seven are always active; the
   rest are auto-selected by keyword match against the deal's topic, so a
   fintech-adjacent thesis pulls in different specialists than a biotech one.
2. **A 155-persona reviewer swarm** (`swarm/personas.py`) — one-line
   character sketches (not job titles), sampled down to 25/50/155 depending
   on run mode, each making one small, deliberately biased LLM call. This is
   the "crowd," not the analyst bench — see Reviewer swarm below.

### Core lens — always active, every run

| Agent | Role |
|---|---|
| ⚡ Agent Provocateur | Disruption finder |
| ◈ Sentiment Reader | Crowd reader |
| ◉ Catalyst Spotter | Flip-event predictor |
| 🧠 Synthesis Orchestrator | Decision-map brain — turns everything below into the final linchpin + scenario map |
| ☠ Tail-Risk Hunter | Kill-shot finder — the low-probability, high-impact trigger nobody's pricing in |
| 🦋 Chaos Mathematician | Tipping points & cascades |
| 💪 Reality Checker | Ground-truth sanity check |

### Domain specialists — keyword-triggered on top of the core seven

| Domain (trigger keywords, examples) | Agents added |
|---|---|
| **Finance** (stock, market, crash, bitcoin, crypto, ipo, earnings, trading, etf, bond, inflation…) | 📊 Chief Economist · 📈 Market Analyst · 📉 Floor Trader · 📐 Quant Analyst · 🎲 Scenario Simulator · 📉 Boom & Bust Historian · 🦉 Value Investor · 🐋 Flow Tracker · 😱 Sentiment Extreme Watcher · 🏛️ Institutional Lens · ₿ Crypto Strategist |
| **Startup / VC** (startup, founder, raise, funding, vc, yc, pitch, valuation, series a, unicorn, saas, mrr, arr…) | 🚀 VC Partner · 📋 Pitch Specialist · 📊 CFO Lens · 💰 Fundraising Strategist · 🧘 Devil's Advocate |
| **Tech** (ai, software, developer, code, platform, cloud, gpu, model, llm, agent, automation, robot…) | 💻 Tech Analyst · ⚖️ Regulatory Analyst |
| **Geopolitics** (war, china, russia, sanctions, election, policy, regulation, government, tariff, nato…) | 🌍 Geopolitical Strategist · ⚖️ Regulatory Analyst |
| **Social / Culture** (tiktok, viral, social media, influencer, brand, gen z, culture, trend, meme…) | 👥 Social Impact Analyst · 📱 Culture Decoder |
| **Career** (career, job, quit, salary, hire, mba, resume, remote work…) | 🎯 Career Strategist · 🧘 Devil's Advocate |
| **Health** (health, vaccine, pharma, fda, drug, pandemic, medical…) | ⚖️ Regulatory Analyst |

A topic whose keywords hit both the Finance and Startup rows pulls in all 7
core agents plus all 11 finance specialists plus all 5 startup specialists —
23 agents active for that single run, verified directly against
`select_agents()`. (`devils_advocate` and `regulatory_analyst` each appear
in more than one row above — Startup/Career and Tech/Geopolitics/Health
respectively — so a topic spanning those rows still only adds each once;
`select_agents()` dedupes.) That matching runs on plain keyword lookups, no
LLM call needed just to decide who shows up; `agent_display_info()` returns
the name/emoji/role for whichever agents were actually selected, and that
list is what
`web/lib/swarm-bridge.ts` surfaces as `activeAgents` in the deal page's
Simulation tab.

### Reviewer swarm — the "crowd," sampled per run

`swarm/personas.py` holds three pools of one-line character sketches (e.g.
*"a hyped VC intern who sees opportunity in everything"*, *"a cynical Reddit
trader who has seen every hype cycle crash"*, *"a pragmatic CFO who only
cares about unit economics and cash flow"*) — 50 bullish, 49 bearish, 56
mixed/analytical, 155 total. Each reviewer gets one small LLM call, forced
into a one-sided reaction (`gut_feeling`, `sentiment`, `emotion`, `hot_take`)
rather than a balanced take, processed in waves of 10 with the model flushed
from GPU memory between waves. Run size depends on mode:

| Mode | Reviewers | Wall-clock (single consumer GPU) |
|---|---|---|
| Turbo (default) | 25 (8 bullish + 8 bearish + 9 mixed) | ~2 min |
| Standard | 50 (15 + 15 + 20) | ~5 min |
| Deep | 155 (the entire persona bank) | ~20 min |

The reviewer swarm's sentiments feed `swarm/pipeline.py`'s dissonance
calculation (pure arithmetic, no LLM call — sentiment extremity, a
consensus-vs-risk gap, and sentiment variance, weighted 0.3/0.4/0.3 into one
composite score) and, non-fatally, `swarm/scoring.py`'s adaptive-scoring
stage, which records which reviewer personas' gut reactions lined up with
the Tail-Risk Hunter's finding as a per-topic-domain learning signal.

## The "thinking" seam — how LLM calls actually happen

Every place `web/` needs an LLM (voice briefings, Q&A, sourcing-agent text,
the Discover NLQ parser) goes through one function,
`agent/crew/brain.ts::think()`, a three-tier fallback stack so the app
degrades gracefully instead of failing:

1. `VCBRAIN_MOCK=1` → returns `null` immediately, no network call at all.
2. `ANTHROPIC_API_KEY` set → direct call via `@anthropic-ai/sdk`
   (`agent/crew/claude.ts`).
3. Otherwise → the `@anthropic-ai/claude-agent-sdk` managed-agent fallback
   (`agent/crew/managed.ts`), which spawns the SDK's own subprocess and works
   off a Claude subscription login with no API key at all. A named
   `sourcing` agent (`agent/crew/managed.ts::CREW`) is defined for this path.
4. If all three fail (or return an auth-shaped error) → the caller falls
   back to a deterministic, template-rendered string built directly from
   Memory data. No step in the pipeline is ever blocked by an LLM outage.

`swarm/` doesn't use this seam at all — it's a fully separate process that
talks to Ollama directly (`swarm/pipeline.py::_ollama_chat`), by design, so a
missing `ANTHROPIC_API_KEY` or Claude login never affects it.

## Integrations

| Capability | Provider / package | Where | Guarded by |
|---|---|---|---|
| Agentic reasoning (briefings, Q&A, sourcing agent, NLQ parsing) | Anthropic — `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk` | `agent/crew/*.ts` | `ANTHROPIC_API_KEY` / Claude subscription login |
| Text-to-speech (spoken briefings, voice Q&A) | ElevenLabs — `@elevenlabs/elevenlabs-js` | `lib/elevenlabs.ts`, `lib/voice-briefing.ts` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| Live web search ("pulse" signal for founder traction, market sizing, product/customer adoption) | Tavily | `agent/tools/tavily.ts` | `TAVILY_API_KEY` |
| Multi-agent scenario simulation (29-agent roster + reviewer swarm) | `swarm/` (this repo, local Ollama) | `lib/swarm-bridge.ts` | `SWARM_BASE_URL` |
| Document diligence (Red Flag Score, Absence Detection, Dealbreaker Scanner, signal log) | External diligence service (not in this repo) | `lib/diligence-bridge.ts` | `DILIGENCE_BASE_URL` |
| Founder shipping signal | GitHub REST API | `agent/tools/github.ts` | `GITHUB_TOKEN` (optional, raises rate limit) |
| Launch signal | Hacker News (Algolia) / Product Hunt | `agent/tools/launches.ts` | `PRODUCTHUNT_TOKEN` (HN needs no key) |
| Shipping + public critique-response signal | X (Twitter) API v2 | `agent/tools/x.ts` | `X_BEARER_TOKEN` |
| Technical depth signal | arXiv | `agent/tools/papers.ts` | none (free, live-verified) |
| IP/inventor signal | PatentsView | `agent/tools/patents.ts` | `PATENTSVIEW_API_KEY` |
| Event discovery (hackathons, pitch/demo days) | Devpost public search | `lib/events.ts` | none |

Every row degrades to a mock fixture or a silent skip when its key/URL is
absent — there is no code path where a missing integration causes a request
to fail.

## Scoring — never a bare number

- **Cold-start** (`lib/scoring/cold-start.ts`) — zero identity signal scores
  50 with interval [5, 95], never a flat penalty. The interval narrows only
  as process signals (shipping cadence, completion rate, critique response,
  writing depth, artifact velocity) accumulate.
- **3-axis** (`lib/scoring/three-axis.ts`) — Founder / Market /
  Idea-vs-Market, each an independent `{score, low, high, trend, confidence,
  basis}` object. Nowhere in the codebase are the three averaged into one
  number — enforced in the UI too: `app/deal/[id]/page.tsx` renders three
  independent `ScoreArc` components, never a single blended gauge. (An
  earlier version of the header computed an average of the three axes'
  confidence into one ring — that was a real bug, not a design choice, and
  has since been removed.)
- **Trust Score** (`lib/scoring/trust-score.ts`) — computed per claim from
  `{dataVolume, dataCleanliness, signalAgreement}`, decomposed rather than
  collapsed into a single per-company trust number.
- **Founder Score persistence** (`lib/memory/founder-score.ts`) — a
  simplified, deliberately non-literal analogue of SM-2 spaced repetition.
  Every time a founder is re-screened, agreement with the prior score grows
  an ease factor and narrows the interval; contradiction widens the
  interval and resets the repetition count. This is what makes a founder's
  score persistent and strengthening across separate applications instead
  of a fresh calculation each time.
- **Sourcing-channel priors** (`lib/scoring/channel-priors.ts`) — a
  Beta-Binomial conjugate prior per sourcing channel (Laplace-smoothed hit
  rate from `dealsFunded` / `dealsSeen`), giving a founder sourced through a
  known-good channel a Bayesian starting point before their own evidence
  takes over.
- **Thesis fit** (`lib/thesis-engine.ts`) — gates `deal.stage` between
  `screening` and `diligence` based on the 3-axis score against a
  configurable thesis.
- **Validator agent** (`lib/validator-agent.ts`) — a second, independent
  pass over the same evidence (e.g. catching a positive Idea-vs-Market axis
  that contradicts a "no users" claim) before a memo ships.
- **Red Flag Score** — the diligence service's document-level 0–100 score
  and traffic light, captured on the deal (not discarded) and rendered
  identically in the deal header and the diligence tab — a header that
  briefly showed an inverted `100 - score` (a real bug, since fixed) doesn't
  happen anymore; both places show the same raw number.

## Structure

```
web/         Next.js 15 / React 19 app — orchestration, scoring, Memory layer, UI
  agent/
    crew/      LLM seam: think(), Claude SDK / API tiers, managed-agent fallback
    tools/     Sourcing tools — GitHub, X, arXiv, patents, launches, website, Tavily
  lib/
    memory/    File-backed Memory store + schema + SM-2-style founder score
    scoring/   Cold-start, 3-axis, Trust Score, channel priors
    *.ts       Diligence bridge, swarm bridge, thesis engine, memo generator,
               traceability, self-validation harness, validator agent,
               discover, digest, events, momentum-plan, voice briefing,
               ElevenLabs client
  app/         Next.js routes: dashboard, deal detail, all /api endpoints
  components/  Dashboard UI — score arcs, trust meter, swarm counter, voice
               player, alert banner, log cascade, hero orb, nav links, etc.
  data/        Deterministic fixtures for mock mode + seed data
diligence/   Contract docs for an external diligence service (no third-party code)
swarm/       Standalone Flask + Ollama service — the 29-agent + reviewer-swarm
             simulation described above (pipeline.py, agents.py, personas.py,
             scoring.py, service.py)
docs/        Architecture notes
```

`web/` is a self-contained application with no embedded third-party source.
It optionally calls two separate services over plain HTTP, each started
independently — the external diligence service (`diligence/README.md`) and
`swarm/` (`swarm/README.md`, part of this repo but always a separate
process). Everything works fully offline in mock mode with zero external
dependencies, including both of those.

## Quick start

```bash
cd web
npm install
npm run dev:mock      # deterministic demo mode, zero network calls
# open http://localhost:3000/dashboard
```

To verify the mock path end to end without opening a browser:

```bash
npm run test:mock
```

To point at live services instead of mock fixtures, unset `VCBRAIN_MOCK` and
set whichever of the environment variables below you have keys for. To run
the swarm simulation live (real Ollama calls, the full 29-agent roster and
reviewer swarm above) instead of the built-in mock scenarios, start `swarm/`
(see `swarm/README.md`) and set `SWARM_BASE_URL` — see `web/.env.example`
and `diligence/README.md` for the rest.

## Environment variables

`web/.env.example`:

| Variable | Purpose | If unset |
|---|---|---|
| `VCBRAIN_MOCK` | Deterministic offline demo mode | — |
| `DILIGENCE_BASE_URL` | External diligence service | Diligence calls use fixtures |
| `ANTHROPIC_API_KEY` | Direct Claude API calls (tier 2 of `think()`) | Falls back to Claude Agent SDK managed-agent tier |
| `TAVILY_API_KEY` | Live web pulse search | Mocked findings |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Text-to-speech for voice briefings/Q&A | Voice endpoints degrade to text-only |
| `SWARM_BASE_URL` | Points at a running `swarm/` instance | Deterministic mock scenario feed |
| `GITHUB_TOKEN` | Higher GitHub API rate limit | Still works, lower rate limit |
| `PRODUCTHUNT_TOKEN` | Product Hunt launch search | That source is skipped |
| `X_BEARER_TOKEN` | X (Twitter) founder-signal tool | That source is skipped |
| `PATENTSVIEW_API_KEY` | Patent/inventor search | That source is skipped |

`swarm/.env.example` (only read by the `swarm/` process, not `web/`):

| Variable | Purpose | Default |
|---|---|---|
| `OLLAMA_BASE_URL` | Where `swarm/` reaches Ollama | `http://localhost:11434` |
| `VISCOSITY_SWARM_MODEL` | Reviewer-swarm model (called once per reviewer) | `llama3.2:3b` |
| `VISCOSITY_RISK_MODEL` | Risk-scan + synthesis model | `phi4:14b` |
| `VISCOSITY_SYNTHESIS_MODEL` | Compress-stage model | `mistral-small:24b` |
| `VISCOSITY_SWARM_SIZE` | Reviewer count if not overridden per-request | `25` (turbo) |
| `PORT` | Port the Flask service listens on | `5100` |

Full descriptions and defaults live in `web/.env.example` and `swarm/.env.example`.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — request flow, Memory
  layer schema, scoring design
- [`docs/ETHICS.md`](docs/ETHICS.md) — data-minimization policy and where
  each constraint is actually enforced in code
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — timed walkthrough and full
  narration script for presenting this to a team or judges
- [`diligence/README.md`](diligence/README.md) — the external diligence
  service's expected API contract
- [`swarm/README.md`](swarm/README.md) — the multi-agent simulation
  service's pipeline stages, full agent roster, models, and setup

## Status

Core pipeline (Memory layer, cold-start scoring, 3-axis scorer, Trust Score,
diligence bridge, memo generator, traceability log, mock mode, dashboard) is
built and verified two ways: type-checks clean, builds clean, an integration
self-check (`npm run test:mock`) exercises the full Sourcing → Screening →
Diligence → Decision flow offline — and separately, the sourcing tools and
the diligence bridge have been run live against the real GitHub API and a
live instance of an external diligence backend, end to end
(source → upload → red-flag scan → dealbreaker scan → signal emitted into
that service's own signal log → memo generated). That live pass caught and
fixed two response-shape mismatches in `lib/diligence-bridge.ts` — see its
type comments for what changed.

Sourcing covers GitHub, Hacker News / Product Hunt launches, website
content, X (official API v2, looks specifically for shipping posts and
public critique-response — not follower counts), arXiv papers (free,
live-verified), Tavily web pulse (founder traction, market sizing,
product/customer signal — three separate queries so each 3-axis dimension
gets real evidence instead of defaulting to a neutral "no evidence" score),
and patents (PatentsView, key-gated, built to their documented contract but
not live-verified — no key was available during development). Every
optional path is guarded the same way: no key means that source is skipped,
not that anything fails.

Given no GitHub handle at all, Sourcing doesn't just give up — it searches
GitHub itself for a plausible match on the company or founder name
(`agent/tools/github.ts::discoverGithubHandle`) before accepting a true cold
start. Anything built from a discovered-not-provided handle is marked as
such in the claim text and scored at lower confidence than an explicitly
supplied one.

A few modules are intentionally partial and say so in their own header
comment: a live self-validation harness (`web/lib/self-validation.ts`) that
needs real outcome data to be useful, a sourcing-channel prior model
(`web/lib/scoring/channel-priors.ts`) that needs a real historical dataset,
and a self-correction validator (`web/lib/validator-agent.ts`, now actually
wired into every sourced deal) with one real check implemented and one
honestly labeled stub.

**Discover** (`/dashboard/discover`, `lib/discover.ts`) — actively searches
GitHub and arXiv for new candidates matching an industry/geography/university
filter, live-verified during development. A natural-language variant
(`/api/discover/nlq`) parses a free-text query like "robotics PhDs in
Boston" into those same structured filters via `think()`, so the filter form
isn't the only way in. Also surfaces founder events (`lib/events.ts` —
hackathons, pitch days, demo days via Devpost's public search,
live-verified) matching the same industry/geography filters, so a VC can see
what's happening in their vertical before any individual founder gets
sourced. Deliberately writes nothing to the Memory layer on its own; a
candidate becomes a real, persisted, scored deal only once a human picks one
and runs it through Sourcing (see `docs/ETHICS.md`).

**Monthly digest** (`/dashboard/digest`, `lib/digest.ts`) — composes a real,
written digest from a live Discover search and renders a copyable preview.
Deliberately does not send anything: no email provider is wired up, and it
never will fire a real send without your explicit go-ahead each time.

**Voice** (`/api/voice/briefing`, `/api/voice/ask`, `lib/voice-briefing.ts`) —
generates a spoken, 30-second partner briefing or answers a free-form
question about a deal, grounded only in Memory data, via the `think()` seam
and ElevenLabs text-to-speech. Degrades to a template-rendered text briefing
when either Claude or an ElevenLabs key is unavailable — never blocks the
dashboard on a missing voice provider.

**Momentum plan** (`/api/momentum-plan`, `lib/momentum-plan.ts`) — a
channel-by-channel action plan targeting a founder's single weakest signal,
built from one Tavily pulse call plus `think()`; each action can be marked
done or logged straight into the Agentic Traceability log.

**Swarm simulation** (`/api/simulation`, `swarm/`, called via
`web/lib/swarm-bridge.ts`) — a standalone Flask service, run entirely
against a local Ollama instance, that takes a deal's topic through six real
stages (crawl public sources, compress into opinion clusters, scan for the
tail-risk trigger, run the 29-agent roster plus a 25/50/155-strong reviewer
swarm of biased personas, calculate cognitive dissonance from that swarm's
actual sentiment data, synthesize a decision map) plus a non-fatal
adaptive-scoring stage. See "The swarm agent roster" above for every named
agent. Live-tested end to end against a local Ollama instance
(`llama3.2:3b` / `phi4:14b` / `mistral-small:24b`) — turbo mode (25
reviewers) completed in just under 3 minutes and returned a real, non-mocked
scenario map matching `swarm-bridge.ts`'s expected shape exactly, no client
changes required. That test also caught and fixed a real bug inherited from
the pipeline's original wave-batching math (integer division was silently
dropping the last partial wave of reviewers) — turbo mode now runs all 25,
not 20. With `SWARM_BASE_URL` unset, `web/` uses a small deterministic mock
scenario pair instead — see `swarm/README.md`.

**Alerts & System Ribbon** (`/api/alerts`, `/api/system-status`) — the
dashboard's alert banner scans Memory for red-flag deals and fresh claims
worth a partner's attention; the System Ribbon reports, per integration,
whether this build is configured to attempt a live call or fall back to a
mock (config presence, not a live network probe — kept instant on purpose).
