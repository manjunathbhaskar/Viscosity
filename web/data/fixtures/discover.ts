// VCBRAIN_MOCK=1 fixtures for the Discover feature — deterministic candidate
// hits for a couple of common filter combinations, so the demo shows real
// discovery behavior offline. Every name here is fictional (see docs/ETHICS.md).

import type { Candidate, DiscoverFilters } from "@/lib/types";

interface DiscoverFixture {
  match: (f: DiscoverFilters) => boolean;
  candidates: Omit<Candidate, "id" | "matchedFilters">[];
}

const FIXTURES: DiscoverFixture[] = [
  {
    match: (f) => /robot/i.test(f.industry ?? "") && /san francisco/i.test(f.geography ?? ""),
    candidates: [
      {
        name: "Devon Achebe",
        headline: "Building perception stacks for warehouse robots — active on GitHub, San Francisco",
        sourceKind: "github",
        sourceUrl: "https://github.com/devon-achebe-demo",
        suggestedCompanyName: "Undisclosed — perception-stack repo",
        suggestedGithubUsername: "devon-achebe-demo",
      },
      {
        name: "Lian Zhou",
        headline: "Maintains an open-source SLAM toolkit, San Francisco Bay Area",
        sourceKind: "github",
        sourceUrl: "https://github.com/lian-zhou-demo",
        suggestedCompanyName: "Undisclosed — SLAM toolkit repo",
        suggestedGithubUsername: "lian-zhou-demo",
      },
    ],
  },
  {
    match: (f) => /(bio|health)/i.test(f.industry ?? "") && /mit/i.test(f.university ?? ""),
    candidates: [
      {
        name: "Farid Novak",
        headline: 'Published "Low-Cost Microfluidic Diagnostics for Point-of-Care Screening"',
        sourceKind: "paper",
        sourceUrl: "https://arxiv.org/abs/demo.discover1",
      },
    ],
  },
  {
    match: (f) => /energy/i.test(f.industry ?? ""),
    candidates: [
      {
        name: "Ren Okafor",
        headline: "Shipping open-source grid-load forecasting models — active GitHub contributor",
        sourceKind: "github",
        sourceUrl: "https://github.com/ren-okafor-demo",
        suggestedCompanyName: "Undisclosed — grid-forecasting repo",
        suggestedGithubUsername: "ren-okafor-demo",
      },
    ],
  },
];

export function mockDiscoverHits(filters: DiscoverFilters): Candidate[] {
  const hits: Candidate[] = [];
  for (const fixture of FIXTURES) {
    if (!fixture.match(filters)) continue;
    for (const c of fixture.candidates) {
      hits.push({ ...c, id: `cand_${hits.length}_${Date.now().toString(36)}`, matchedFilters: filters });
    }
  }
  return hits;
}
