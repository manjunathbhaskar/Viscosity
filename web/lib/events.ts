// Founder events — hackathons, pitch days, demo days matching a vertical and
// (where possible) a geography, so a VC can see what's happening before any
// individual founder from it gets sourced. Live-verified during development:
// Devpost's public hackathons search API (`devpost.com/api/hackathons?search=`)
// returns real events with location, dates, and theme tags using a plain
// unauthenticated request — no key, no special headers.
//
// Devpost's search is keyword-only; there's no location query parameter in
// their public API, so geography is applied as a client-side filter against
// the location string each event already carries. "Online" events pass a
// geography filter too — they're not tied to any single place, so filtering
// them out of a "San Francisco" search would just hide real signal.

import type { DiscoverFilters, FounderEvent } from "@/lib/types";

const TIMEOUT_MS = 12_000;

interface DevpostHackathon {
  id: number;
  title: string;
  displayed_location?: { location?: string };
  url: string;
  submission_period_dates?: string;
  themes?: { name: string }[];
  organization_name?: string;
}

function newEventId(): string {
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function mockFounderEvents(filters: DiscoverFilters): Promise<FounderEvent[]> {
  const { mockEventHits } = await import("@/data/fixtures/events");
  return mockEventHits(filters);
}

export async function searchFounderEvents(filters: Pick<DiscoverFilters, "industry" | "geography">): Promise<FounderEvent[]> {
  if (!filters.industry && !filters.geography) return [];
  if (process.env.VCBRAIN_MOCK === "1") return mockFounderEvents(filters);

  try {
    const query = filters.industry ?? filters.geography ?? "";
    const res = await fetch(`https://devpost.com/api/hackathons?search=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${res.status} searching Devpost events`);
    const data = await res.json();
    const hackathons: DevpostHackathon[] = Array.isArray(data.hackathons) ? data.hackathons : [];

    const events: FounderEvent[] = hackathons.map((h) => ({
      id: newEventId(),
      title: h.title,
      location: h.displayed_location?.location ?? "Unknown",
      url: h.url,
      submissionDates: h.submission_period_dates ?? "",
      themes: (h.themes ?? []).map((t) => t.name),
      organizer: h.organization_name,
    }));

    if (!filters.geography) return events;
    const geo = filters.geography.toLowerCase();
    return events.filter((e) => e.location === "Online" || e.location.toLowerCase().includes(geo));
  } catch (err) {
    console.error("[events:devpost]", err);
    return [];
  }
}
