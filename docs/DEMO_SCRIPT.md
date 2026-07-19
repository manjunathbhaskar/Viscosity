# Demo script

Open on the deterministic cached workspace so the demo never depends on a
network call:

```bash
cd web && npm run dev:mock
```

Open `http://localhost:3000/dashboard`. Four fictional founders are seeded
automatically on first load — no manual setup needed before you start
talking.

## Timed walkthrough (~2 minutes)

| Time | Screen | Presenter line |
|---|---|---|
| 0:00–0:15 | Decision-ready queue | "Most screening tools score a founder once, on one number. We score three things independently, and we show our uncertainty instead of hiding it." |
| 0:15–0:40 | Ada Cortex's deal | "This founder has a real GitHub history, a launch post, a personal site, X activity — founder axis scores 85, in a tight 69–100 range. Every one of those claims traces to a real URL, and click any claim to see exactly how much we trust it and why." |
| 0:40–1:00 | Kenji Osei's deal | "This founder has nothing public at all. We don't fail, and we don't punish him for it — neutral 50, honest 5–95 range. That's the whole point: zero track record isn't a red flag at pre-seed, it's the baseline." |
| 1:00–1:20 | Priyanka Sridhar's deal | "We only had a company name for this one — no GitHub handle given. The system went and found a real candidate itself, labeled it as inferred rather than confirmed, and scored it slightly lower confidence until a human checks the match. It also picked up a real paper and a patent along the way." |
| 1:20–1:40 | Marco Delacroix's deal | "This is what a real flag looks like: the Dealbreaker Scanner caught a co-founder dispute mentioned in his own site copy. That's a critical finding sitting right on the deal page — not buried, not softened." |
| 1:40–2:00 | Source a founder (live) | "And this is live, not scripted — I'll paste a real GitHub handle right now and you'll watch it score in real time." |

## Full narration script

Most VC screening tools score a founder once, hand back a single number,
and move on. That number usually can't handle a founder with no funding
history and a small GitHub — either it can't score them at all, or it
quietly marks them down for having no track record. Neither is honest.

The VC Brain starts from a different assumption: at pre-seed, having
nothing to show yet is normal, not disqualifying. So instead of one score,
every founder gets three — Founder, Market, Idea-vs-Market — each computed
independently and never blended into a single headline number. Each one
ships with a range, not a fake precise figure, and the range narrows only
as real evidence actually accumulates.

Sourcing starts with whatever you give it — a GitHub handle, an X handle, a
website, a pasted deck, or just a name. If you give it nothing but a
company name, it doesn't just give up: it searches for a plausible GitHub
match itself, the same way a human researcher would, and it's honest about
the fact that a discovered match is inferred, not confirmed, until someone
checks it.

Every fact that comes back — a shipped repo, a launch post, a technical
paper, a patent, an X thread — becomes a claim tied to exactly the URL it
came from. Nothing is ever asserted without a source. Click any claim and
you don't just see a number, you see how much corroborating evidence exists
for it, how clean the source was, and whether independent sources agree.

Screening runs a dealbreaker scan and a thesis-fit check on every deal, and
both show their actual reasoning, not just a pass/fail. Diligence pushes the
evidence to a document-risk scan and a check for what's conspicuously
missing — and when something's missing, the memo says so explicitly rather
than filling the gap with a guess.

If a deal clears the bar, a memo writes itself — but only the sections that
have real evidence behind them, and a second-opinion pass checks the
reasoning for internal contradictions before it ships.

Nothing here sends an email, buys contact data, or takes an action on
anyone's behalf. It produces evidence, a score, and a memo. A human makes
the actual call.

## Recommended click path

1. Dashboard — glance at all four seeded deals and their scores.
2. Ada Cortex — the well-evidenced founder; open a claim's source link, point
   out the trust badge decomposition.
3. Kenji Osei — the true cold-start founder; point out the score is neutral,
   not low, and the interval is honestly wide.
4. Priyanka Sridhar — point out the "(auto-discovered)" claim text and the
   paper/patent claims.
5. Marco Delacroix — point out the Dealbreaker Scanner section showing a
   real critical finding.
6. `/dashboard/source` — source a founder live, on a real GitHub handle, in
   front of the room.
7. `/dashboard/validate` — the prediction log, and the honest note that it's
   real logging machinery waiting on real outcome data.

## Testing

```bash
npm run test:mock   # scripted end-to-end check, no browser needed
npm run build        # production build
```

`npm run test:mock` starts a local server, sources both a sourced and an
applied deal, verifies the three axes stay independent, checks the trust
score is decomposed rather than a bare number, confirms the Red Flag Score
and Thesis Fit reasoning are actually persisted rather than discarded,
confirms the self-correction validator actually ran, and generates a memo —
23 assertions in total.
