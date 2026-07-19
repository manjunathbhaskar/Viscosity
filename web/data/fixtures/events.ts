// VCBRAIN_MOCK=1 fixtures for founder-events discovery — deterministic hits
// for a couple of common filter combos. Events here are fictional demo data
// (see docs/ETHICS.md), not real hackathons.

import type { DiscoverFilters, FounderEvent } from "@/lib/types";

interface EventFixture {
  match: (f: DiscoverFilters) => boolean;
  events: Omit<FounderEvent, "id">[];
}

const FIXTURES: EventFixture[] = [
  {
    match: (f) => /robot/i.test(f.industry ?? "") || /san francisco/i.test(f.geography ?? ""),
    events: [
      {
        title: "Bay Area Robotics Demo Day",
        location: "San Francisco, CA",
        url: "https://example-hackathons.demo/bay-robotics-demo-day",
        submissionDates: "Aug 10 - Sep 02, 2026",
        themes: ["Robotics", "Hardware"],
        organizer: "SF Robotics Collective",
      },
      {
        title: "Autonomous Systems Hack Week",
        location: "Online",
        url: "https://example-hackathons.demo/autonomous-systems-hackweek",
        submissionDates: "Jul 28 - Aug 18, 2026",
        themes: ["Robotics", "Machine Learning/AI"],
      },
    ],
  },
  {
    match: (f) => /(bio|health)/i.test(f.industry ?? ""),
    events: [
      {
        title: "Biotech Builders Pitch Night",
        location: "Boston, MA",
        url: "https://example-hackathons.demo/biotech-builders-pitch",
        submissionDates: "Sep 05, 2026",
        themes: ["Biotech", "Health"],
        organizer: "MIT Biotech Founders Group",
      },
    ],
  },
  {
    match: (f) => /energy/i.test(f.industry ?? ""),
    events: [
      {
        title: "Grid Futures Hackathon",
        location: "Online",
        url: "https://example-hackathons.demo/grid-futures-hackathon",
        submissionDates: "Aug 01 - Aug 24, 2026",
        themes: ["Energy", "Climate"],
      },
    ],
  },
];

export function mockEventHits(filters: DiscoverFilters): FounderEvent[] {
  const hits: FounderEvent[] = [];
  for (const fixture of FIXTURES) {
    if (!fixture.match(filters)) continue;
    for (const e of fixture.events) {
      hits.push({ ...e, id: `evt_${hits.length}_${Date.now().toString(36)}` });
    }
  }
  return hits;
}
