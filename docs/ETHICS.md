# Ethics and data minimization

The VC Brain evaluates real people before they've agreed to a formal
diligence process — often before they even know they're being looked at.
That's a meaningfully different responsibility than scoring a company's
financials, and the system is built around a specific set of constraints
because of it. This document says what those constraints are and where
they're enforced in code, not just in policy.

## Public signals only

Every enrichment tool (`agent/tools/github.ts`, `website.ts`, `launches.ts`,
`x.ts`, `papers.ts`, `patents.ts`) reads only what's already public: GitHub
activity, launch posts, a public website, public posts, published papers,
issued patents. Nothing here logs in as the founder, nothing accesses a
private account, nothing purchases a data broker's private profile. If a
future tool needs anything beyond public data, it should say so loudly in
its own file header, the way this one does.

## No claim without a source

Enforced in the type system, not just convention: `Claim.sourceId` is
required, not optional (`lib/types.ts`). There is no code path that writes a
claim without a `Source` behind it. Every claim shown in the UI links back
to the exact URL it came from.

## Uncertainty is shown, never hidden

A founder with no public footprint gets a neutral score and an honestly
wide interval (`lib/scoring/cold-start.ts`) — never a fabricated precise
number, never a penalty for having nothing to find. Every score in the
product ships with its interval and its confidence level visible, not
buried behind a single headline number.

## Missing data is flagged, never fabricated

The memo generator (`lib/memo-generator.ts`) renders a section only when
real claims back it. Where the diligence engine's absence-detection flags a
gap, the memo says so explicitly ("Cap table: not disclosed") rather than
guessing or omitting the question entirely.

## Auto-discovered identity is marked as inferred, not confirmed

When Sourcing has no explicit GitHub handle and searches for one itself
(`agent/tools/github.ts::discoverGithubHandle`), every claim built from that
discovered handle says so in its own text and is scored at lower confidence
than an explicitly-provided handle (`agent/tools/founder-enrichment.ts`).
An inferred identity match is not the same fact as a confirmed one, and the
data shouldn't pretend otherwise. A human should confirm the match before
it drives a real decision.

## Discovery creates no shadow profiles

Discover (`lib/discover.ts`) actively searches GitHub and arXiv for
candidates matching a filter — that's a materially bigger surface than
scoring one founder you already named. Matching a filter search is not
consent to being evaluated, so a search result is deliberately ephemeral:
nothing is written to the Memory layer, no Claim or Source record is
created, and no score is computed, for anyone who merely shows up in a
results list. That only starts once a human explicitly picks a candidate
and runs them through Sourcing — the same claim-by-claim, evidence-linked
process every other founder goes through, not a shortcut.

## The digest never sends itself

The monthly digest (`lib/digest.ts`) composes real written text from a live
Discover search, but stops there — no email provider is wired up, and nothing
in this codebase will fire a real send on a schedule or without a human
explicitly approving a specific recipient and message each time.

## A human makes the decision

This system produces a memo, a set of scores, and an evidence trail — it
does not send an offer, wire money, or take any action a person hasn't
approved. The "Decision" stage in Sourcing → Screening → Diligence →
Decision is a human reading the output, not the system acting on it. Nothing
here auto-executes anything.

## Memory persists per-founder, not across unrelated context

The Founder Score record (`lib/memory/founder-score.ts`) strengthens or
weakens as the *same* founder is re-evaluated across applications — it does
not blend or leak signal between unrelated founders or companies. Each
founder's evidence trail is scoped to their own claims and sources.

## Demo data is clearly fictional

Every founder in `data/fixtures/founders.ts` — names, companies, GitHub
handles, X posts, papers, patents — is invented for the deterministic demo
mode. None of it refers to a real person or company, and none of it is
presented as real anywhere in the product. This is a deliberate choice, not
an oversight: assigning a real, named, identifiable person an investment
score in a demo — even a positive one — is a different and worse privacy
footprint than using invented data, and the fictional roster avoids that
entirely.

## What this system is not

It is not a background-check tool, a surveillance tool, or a substitute for
actually talking to the founder. It narrows and organizes public evidence so
a human can make a faster, better-informed decision — the decision itself,
and the responsibility for it, stays with the human.
