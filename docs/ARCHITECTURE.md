# The VC Brain — architecture

Sourcing → Screening → Diligence → Decision, in one Next.js app (`web/`) that
calls a separate, external diligence service over HTTP for document-analysis
capabilities. See `diligence/README.md` for that service's contract.

## Two services

- **`web/`** — orchestration + UI + Memory layer + all scoring. Everything in
  this repository lives here: Next.js 15 / React 19, a file-backed Memory
  store, a tool-calling layer for public founder signal, and a deterministic
  mock mode for demos.
- **External diligence service** (not part of this repository) — a
  document-analysis engine: knowledge graph, Red Flag Score, Absence
  Detection, a rule-based Dealbreaker Scanner, and a signal log. Called only
  via `web/lib/diligence-bridge.ts`, over plain HTTP. Start it independently
  and point `DILIGENCE_BASE_URL` at it — see `diligence/README.md`.

## Request flow (one deal, start to finish)

```
POST /api/source  { route, founderName, companyName, githubUsername?, deckMarkdown? }
  -> agent/crew/pipeline.ts::sourceAndScreenDeal
     -> agent/tools/founder-enrichment.ts   (outbound: GitHub + launches + website)
        -> lib/diligence-bridge.ts::uploadDossier -> diligence service POST /api/ma/upload
     -> (inbound: deck text -> naive line-based claims, same Claim/Source shape)
     -> lib/diligence-bridge.ts::runWarroom, scanDealbreakers
     -> lib/scoring/three-axis.ts::computeThreeAxisScore
        -> lib/scoring/cold-start.ts (if zero identity signal)
     -> lib/scoring/trust-score.ts::computeTrustScoresForSubject
     -> lib/thesis-engine.ts::evaluateThesisFit  -> deal.stage: screening | diligence
     -> lib/traceability.ts -> lib/diligence-bridge.ts::emitDiligenceSignal (diligence service signal log)
     -> lib/memory/store.ts::updateMemory (persist everything)
     -> lib/memory/founder-score.ts::strengthenFounderScore (persistent, never resets)
     -> lib/self-validation.ts::logPrediction (self-validation harness)

PATCH /api/screen { dealId }     -> re-run Screening gate on new evidence
POST  /api/memo   { dealId }     -> lib/memo-generator.ts -> deal.stage: decision_ready
GET   /api/deals[?id]            -> decision-ready queue / deal detail
GET   /api/trust?founderId=      -> per-claim Trust Score
GET   /api/traceability?dealId=  -> Agentic Traceability log
GET/POST /api/validate           -> self-validation harness
```

## Mock mode

`VCBRAIN_MOCK=1` — no network call happens anywhere in the request flow
above. Every external touchpoint (`agent/tools/*`, `lib/diligence-bridge.ts`)
branches to a fixture at the top of the function. `lib/memory/seed.ts::ensureDemoSeed`
also seeds two deterministic example founders on first read — one
well-evidenced, one true cold-start (zero fixture hit) — so the demo shows
both scoring paths without a manual step. Run `npm run test:mock`
(`scripts/mock-fallback-selfcheck.mjs`) to verify the mock path end to end
before a demo.

## Memory layer

One file-backed JSON store (`data/runtime/memory.json`), queued through
`globalThis` so every route bundle in a dev server serializes through the
same read-modify-write chain (see comments in `lib/memory/store.ts`). Holds
`founders`, `companies`, `claims`, `sources`, `deals`, `founderScores`
(persistent, strengthens over repeated corroboration — `lib/memory/founder-score.ts`),
`trustScores`, `traceability`, `memos`, `channels`, `dealbreakers`.
`DealRecord` is the per-application record; `FounderScoreRecord` is what
survives across applications.

## Scoring — never a bare number

- **Cold-start** (`lib/scoring/cold-start.ts`): zero identity signal -> score
  50, interval [5, 95]. Never a penalty for thin data. Interval narrows as
  process signals (shipping cadence, completion rate, critique response,
  writing depth, artifact velocity) accumulate.
- **3-axis** (`lib/scoring/three-axis.ts`): Founder / Market / Idea-vs-Market,
  each an independent `{score, low, high, trend, confidence, basis}` object.
  Nowhere in the codebase are these three averaged into one number.
- **Trust Score** (`lib/scoring/trust-score.ts`): per claim —
  `{dataVolume, dataCleanliness, signalAgreement}` decomposed, not collapsed.

## What's a real module boundary but not fully implemented

Each file below says so explicitly in its own header comment: `lib/self-validation.ts`
(needs real outcome ground truth this build doesn't have), `lib/scoring/channel-priors.ts`
(needs a real historical outcome dataset), `lib/validator-agent.ts` (one real
check implemented, rest stubbed).
