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

Two services, talking over plain HTTP:

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
│ Diligence      │   │ Multi-agent      │   │ ElevenLabs         │
│ service        │   │ "Swarm" sim      │   │ text-to-speech     │
│ (external,     │   │ sidecar          │   │                    │
│ not in repo)   │   │ (external,       │   │                    │
│                │   │ optional)        │   │                    │
└───────────────┘   └──────────────────┘   └────────────────────┘
```

- **`web/`** — the only code in this repository. Owns orchestration, the
  Memory layer, all scoring, the agentic sourcing tools, and the dashboard
  UI. Runs fully offline in mock mode with zero external dependencies.
- **External diligence service** (not part of this repo, see
  `diligence/README.md`) — document-analysis engine: knowledge graph, Red
  Flag Score, Absence Detection, a rule-based Dealbreaker Scanner, and a
  signal log. Reached only via `web/lib/diligence-bridge.ts`.
- **Swarm simulation sidecar** (external, optional, `SWARM_BASE_URL`) — an
  adversarial multi-agent "war-game" of a deal: independent agent personas
  (e.g. "VC Partner", "Chaos Analyst", "Market Analyst") debate bull/bear
  scenarios for a founder or thesis. Reached via `web/lib/swarm-bridge.ts`;
  falls back to a deterministic mock feed when unset.

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
                                      (adversarial multi-agent scenario debate)
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
```

## The "thinking" seam — how LLM calls actually happen

Every place the system needs an LLM (voice briefings, Q&A, sourcing-agent
text) goes through one function, `agent/crew/brain.ts::think()`, a three-tier
fallback stack so the app degrades gracefully instead of failing:

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

## Integrations

| Capability | Provider / package | Where | Guarded by |
|---|---|---|---|
| Agentic reasoning (briefings, Q&A, sourcing agent) | Anthropic — `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk` | `agent/crew/*.ts` | `ANTHROPIC_API_KEY` / Claude subscription login |
| Text-to-speech (spoken briefings, voice Q&A) | ElevenLabs — `@elevenlabs/elevenlabs-js` | `lib/elevenlabs.ts`, `lib/voice-briefing.ts` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| Live web search ("pulse" signal for founder traction, market sizing, product/customer adoption) | Tavily | `agent/tools/tavily.ts` | `TAVILY_API_KEY` |
| Adversarial multi-agent scenario simulation | Swarm sidecar (any service implementing `POST /api/simulate`) | `lib/swarm-bridge.ts` | `SWARM_BASE_URL` |
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
  independent `ScoreArc` components, never a single blended gauge.
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
               discover, digest, events, voice briefing, ElevenLabs client
  app/         Next.js routes: dashboard, deal detail, all /api endpoints
  components/  Dashboard UI: score arcs, trust meter, swarm counter, voice player, etc.
  data/        Deterministic fixtures for mock mode + seed data
diligence/   Contract docs for an external diligence service (no third-party code)
docs/        Architecture notes
```

`web/` is a self-contained application with no embedded third-party source.
It optionally calls a separate diligence service over plain HTTP for
document-analysis capabilities — see `diligence/README.md` for that
contract. Everything works fully offline in mock mode with zero external
dependencies.

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
set whichever of the environment variables below you have keys for — see
`web/.env.example` and `diligence/README.md`.

## Environment variables

| Variable | Purpose | If unset |
|---|---|---|
| `VCBRAIN_MOCK` | Deterministic offline demo mode | — |
| `DILIGENCE_BASE_URL` | External diligence service | Diligence calls use fixtures |
| `ANTHROPIC_API_KEY` | Direct Claude API calls (tier 2 of `think()`) | Falls back to Claude Agent SDK managed-agent tier |
| `TAVILY_API_KEY` | Live web pulse search | Mocked findings |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Text-to-speech for voice briefings/Q&A | Voice endpoints degrade to text-only |
| `SWARM_BASE_URL` | Adversarial multi-agent simulation sidecar | Deterministic mock scenario feed |
| `GITHUB_TOKEN` | Higher GitHub API rate limit | Still works, lower rate limit |
| `PRODUCTHUNT_TOKEN` | Product Hunt launch search | That source is skipped |
| `X_BEARER_TOKEN` | X (Twitter) founder-signal tool | That source is skipped |
| `PATENTSVIEW_API_KEY` | Patent/inventor search | That source is skipped |

Full descriptions and defaults live in `web/.env.example`.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — request flow, Memory
  layer schema, scoring design
- [`docs/ETHICS.md`](docs/ETHICS.md) — data-minimization policy and where
  each constraint is actually enforced in code
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — timed walkthrough and full
  narration script for presenting this to a team or judges
- [`diligence/README.md`](diligence/README.md) — the external diligence
  service's expected API contract

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
filter, live-verified during development. Also surfaces founder events
(`lib/events.ts` — hackathons, pitch days, demo days via Devpost's public
search, live-verified) matching the same industry/geography filters, so a
VC can see what's happening in their vertical before any individual founder
gets sourced. Deliberately writes nothing to the Memory layer on its own; a
candidate becomes a real, persisted, scored deal only once a human picks
one and runs it through Sourcing (see `docs/ETHICS.md`).

**Monthly digest** (`/dashboard/digest`, `lib/digest.ts`) — composes a real,
written digest from a live Discover search and renders a copyable preview.
Deliberately does not send anything: no email provider is wired up, and it
never will fire a real send without your explicit go-ahead each time.

**Voice** (`/api/voice/briefing`, `/api/voice/ask`, `lib/voice-briefing.ts`) —
generates a spoken, 30-second partner briefing or answers a free-form
question about a deal, grounded only in Memory data, via the `think()`
seam and ElevenLabs text-to-speech. Degrades to a template-rendered text
briefing when either Claude or an ElevenLabs key is unavailable — never
blocks the dashboard on a missing voice provider.

**Simulation** (`/api/simulation`, `lib/swarm-bridge.ts`) — runs an
adversarial multi-agent scenario debate over a deal or thesis through an
external Swarm sidecar when `SWARM_BASE_URL` is set, or returns a
deterministic two-scenario mock feed (bull case / bear case, each with named
agent commentary) otherwise.
