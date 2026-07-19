"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Candidate {
  id: string;
  name: string;
  headline: string;
  sourceKind: string;
  sourceUrl: string;
  suggestedCompanyName?: string;
  suggestedGithubUsername?: string;
}

interface FounderEvent {
  id: string;
  title: string;
  location: string;
  url: string;
  submissionDates: string;
  themes: string[];
  organizer?: string;
}

const SOURCE_BADGE: Record<string, string> = { github: "badge-green", paper: "badge-amber" };

export default function DiscoverPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"founders" | "events">("founders");
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [university, setUniversity] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [events, setEvents] = useState<FounderEvent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setBusy(true);
    setError(null);
    try {
      const [candidateRes, eventRes] = await Promise.all([
        fetch("/api/discover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ industry: industry || undefined, geography: geography || undefined, university: university || undefined }),
        }),
        industry || geography
          ? fetch("/api/events", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ industry: industry || undefined, geography: geography || undefined }),
            })
          : Promise.resolve(null),
      ]);

      const candidateData = await candidateRes.json();
      if (!candidateData.ok) throw new Error(candidateData.error ?? "search failed");
      setCandidates(candidateData.candidates);

      if (eventRes) {
        const eventData = await eventRes.json();
        setEvents(eventData.ok ? eventData.events : []);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function screenCandidate(c: Candidate) {
    const qs = new URLSearchParams({
      prefillName: c.name,
      prefillCompany: c.suggestedCompanyName ?? "",
      prefillGithub: c.suggestedGithubUsername ?? "",
      prefillSource: c.sourceKind,
    });
    router.push(`/dashboard/source?${qs.toString()}`);
  }

  const noFilters = !industry && !geography && !university;

  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">discover</p>
        <h1 className="serif text-[28px]">Find founders — and what&apos;s happening — before anyone sources them</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--muted)]">
          Filters run live against GitHub, arXiv, and Devpost — not just what&apos;s already in your Memory
          layer. Nothing here is saved or scored until you explicitly choose to screen someone.
        </p>
      </div>

      <div className="card-paper grid gap-3 p-5 sm:grid-cols-4">
        <input className="input" placeholder="industry (e.g. robotics)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <input className="input" placeholder="geography (e.g. San Francisco)" value={geography} onChange={(e) => setGeography(e.target.value)} />
        <input className="input" placeholder="university (e.g. MIT)" value={university} onChange={(e) => setUniversity(e.target.value)} />
        <button className="btn" disabled={busy || noFilters} onClick={search}>
          {busy ? "searching…" : "search"}
        </button>
      </div>

      {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

      <div className="card-paper flex w-fit gap-1 p-1.5">
        <button className={`pill-tab ${tab === "founders" ? "active" : ""}`} onClick={() => setTab("founders")}>
          founders{candidates ? ` (${candidates.length})` : ""}
        </button>
        <button className={`pill-tab ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
          events{events ? ` (${events.length})` : ""}
        </button>
      </div>

      {tab === "founders" && (
        <>
          {candidates && candidates.length === 0 && (
            <div className="card-paper p-8 text-center">
              <p className="label">no candidates matched — try a broader industry term</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {candidates?.map((c) => (
              <div key={c.id} className="card-paper flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">{c.name}</p>
                    <span className={`badge ${SOURCE_BADGE[c.sourceKind] ?? "badge-gray"}`}>{c.sourceKind}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--muted)]">{c.headline}</p>
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="label link-green mt-1 inline-block">
                    source →
                  </a>
                </div>
                <button className="btn btn-ghost shrink-0" onClick={() => screenCandidate(c)}>
                  screen this founder →
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "events" && (
        <>
          <p className="label -mt-2">
            hackathons, pitch days, and demo days matching your filters — geography-filtered client-side since
            the underlying event search is keyword-only
          </p>
          {events && events.length === 0 && (
            <div className="card-paper p-8 text-center">
              <p className="label">no events matched — try industry only, or a broader geography</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {events?.map((e) => (
              <div key={e.id} className="card-paper flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">{e.title}</p>
                    <span className="badge badge-gray">{e.location}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--muted)]">
                    {e.submissionDates}
                    {e.themes.length > 0 ? ` · ${e.themes.join(", ")}` : ""}
                    {e.organizer ? ` · ${e.organizer}` : ""}
                  </p>
                  <a href={e.url} target="_blank" rel="noreferrer" className="label link-green mt-1 inline-block">
                    event page →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
