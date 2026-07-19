// Monthly digest generator — TIER 2 by design (per the scope you picked):
// this composes a real, written digest from live Discover results, and
// gives you something to preview and copy. It does NOT send anything.
// Wiring a real send needs an email provider (e.g. Resend/Postmark) and,
// separately, your explicit confirmation of a real recipient each time —
// neither of those happens automatically, ever.
//
// Deliberately built on top of lib/discover.ts rather than Memory: your own
// example ("we noticed XYZ published this paper, is doing a PhD at MIT...")
// describes a freshly-discovered candidate, not an already-scored deal, so
// the digest is a formatted write-up of a Discover search, not a summary of
// your pipeline.

import { discoverCandidates } from "./discover";
import type { Candidate, DiscoverFilters } from "@/lib/types";

export interface DigestEntry {
  candidateName: string;
  blurb: string;
  sourceUrl: string;
}

export interface DigestResult {
  filters: DiscoverFilters;
  generatedAt: string;
  entries: DigestEntry[];
  subjectLine: string;
  bodyText: string;
}

function filterLabel(filters: DiscoverFilters): string {
  return [filters.industry, filters.geography, filters.university].filter(Boolean).join(" · ") || "your watchlist";
}

function toBlurb(c: Candidate): string {
  switch (c.sourceKind) {
    case "paper":
      return `We noticed ${c.name} ${c.headline.toLowerCase()} — worth a look if this fits your thesis.`;
    case "github":
      return `We noticed ${c.name} — ${c.headline.charAt(0).toLowerCase()}${c.headline.slice(1)}.`;
    default:
      return `We noticed ${c.name} — ${c.headline}.`;
  }
}

export async function generateDigest(filters: DiscoverFilters): Promise<DigestResult> {
  const candidates = await discoverCandidates(filters);
  const entries: DigestEntry[] = candidates.map((c) => ({
    candidateName: c.name,
    blurb: toBlurb(c),
    sourceUrl: c.sourceUrl,
  }));

  const label = filterLabel(filters);
  const subjectLine = entries.length > 0 ? `${entries.length} new founder${entries.length === 1 ? "" : "s"} matching ${label}` : `No new matches for ${label} this month`;

  const bodyText =
    entries.length === 0
      ? `No new candidates matched ${label} this run. Nothing fabricated to fill the gap — try again after broadening the filter or next month.`
      : [
          `Here's what came up for ${label}:`,
          "",
          ...entries.map((e, i) => `${i + 1}. ${e.blurb}\n   ${e.sourceUrl}`),
          "",
          "Every line above traces to the URL next to it — nothing here is inferred beyond what's public.",
        ].join("\n");

  return { filters, generatedAt: new Date().toISOString(), entries, subjectLine, bodyText };
}
