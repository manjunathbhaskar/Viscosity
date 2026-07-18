# Diligence service (external, not part of this repository)

`web/` never embeds a diligence engine's source — it's a separate service,
started independently, reached only over HTTP through `web/lib/diligence-bridge.ts`.
This directory documents the contract that service needs to satisfy; it
contains no third-party code.

## Running the diligence service

Point `DILIGENCE_BASE_URL` (see `web/.env.example`) at wherever your
diligence service is running — by default `web/` expects it at
`http://localhost:5000`. Any service that implements the routes below will
work; this repository ships fixtures matching the expected shapes so
`VCBRAIN_MOCK=1` runs fully offline without one.

## Optional local-model dependency

Most of the diligence routes below are expected to be pure algorithm/rule
based and need nothing extra. A subset — an adversarial debate pass and the
optional LLM half of the dealbreaker scan — may depend on a locally-running
model runtime in your implementation. Document that dependency clearly in
your diligence service's own README so `VCBRAIN_MOCK=1` and even live mode
with that runtime down still work for the routes wired up here.

## Routes `web/` calls

| Route | Method | web/ caller |
|---|---|---|
| `/api/ma/upload` | POST, multipart `file` | `lib/diligence-bridge.ts::uploadDossier` |
| `/api/ma/warroom` | POST, `{doc_id?}` | `lib/diligence-bridge.ts::runWarroom` |
| `/api/ma/semantic/absences` | POST, `{doc_ids}` | `lib/diligence-bridge.ts::detectAbsences` |
| `/api/ma/signals/emit` | POST, `{signal_type, source_entity, ...}` | `lib/diligence-bridge.ts::emitDiligenceSignal` |
| `/api/ma/leukocyte/:docId` | POST | `lib/diligence-bridge.ts::scanDealbreakers` |

Every shape above has been verified against a live-running instance, not
assumed from a spec — see the type comments in `lib/diligence-bridge.ts` for
the exact nesting (`warroom`'s score lives under `red_flags`, not top-level;
`leukocyte` returns `{result: {clean_bill, critical_findings}}`, not the
flat `pre_screen_findings` shape an earlier draft assumed).

New VC Brain signal types (`FOUNDER_MOMENTUM`, `TRACTION_SIGNAL`,
`CONTRADICTION_FLAG`) are emitted through the existing `/api/ma/signals/emit`
route — no schema change is needed on the diligence-service side as long as
its signal-type column is free-text. Verified live: a signal emitted here
shows up in that service's own signal log immediately.

**Known caveat (found via live testing, not fixed here since it lives in
the external service):** the `leukocyte` route's LLM pass appears tuned for
full merger-agreement documents. Given a short, differently-shaped document
(e.g. a founder dossier with no M&A boilerplate), it can return findings
referencing entities that were never in the input at all. Treat findings
from this route as a prompt to investigate manually, not as ground truth,
until the external service documents how it handles out-of-domain input.

## Extending the bridge

To wrap another diligence-service route (e.g. knowledge-graph queries, an
adversarial debate endpoint once its model-runtime requirement is
documented), add a function to `web/lib/diligence-bridge.ts` following the
existing `safeFetch(path, init, mockFallback)` pattern — every function needs
a fixture branch so `VCBRAIN_MOCK=1` keeps working with zero network calls.
