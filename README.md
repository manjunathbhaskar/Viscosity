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

## Structure

```
web/         Next.js 15 / React 19 app — orchestration, scoring, Memory layer, UI
diligence/   Contract docs for an external diligence service (no third-party code)
docs/        Architecture notes
```

`web/` is a self-contained application with no embedded third-party source.
It optionally calls a separate diligence service over plain HTTP for
document-analysis capabilities (knowledge graph, red-flag scan, absence
detection, dealbreaker scan) — see `diligence/README.md` for that contract.
Everything works fully offline in mock mode with zero external dependencies.

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

To point at a live diligence service instead of mock fixtures, unset
`VCBRAIN_MOCK` and set `DILIGENCE_BASE_URL` — see `web/.env.example` and
`diligence/README.md`.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — request flow, Memory
  layer schema, scoring design
- [`diligence/README.md`](diligence/README.md) — the external diligence
  service's expected API contract

## Status

Core pipeline (Memory layer, cold-start scoring, 3-axis scorer, Trust Score,
diligence bridge, memo generator, traceability log, mock mode, dashboard) is
built and verified: type-checks clean, builds clean, and an integration
self-check (`npm run test:mock`) exercises the full Sourcing → Screening →
Diligence → Decision flow.

A few modules are intentionally partial and say so in their own header
comment: a live self-validation harness (`web/lib/self-validation.ts`) that
needs real outcome data to be useful, a sourcing-channel prior model
(`web/lib/scoring/channel-priors.ts`) that needs a real historical dataset,
and a self-correction validator (`web/lib/validator-agent.ts`) with one real
check implemented.
