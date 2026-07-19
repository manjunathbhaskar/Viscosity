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

const SOURCE_BADGE: Record<string, string> = { github: "badge-green", paper: "badge-amber", patent: "badge-blue" };

const MOCK_WINNERS = [
  { id: "w1", name: "Aria Nakamura", hackathon: "HackMIT 2026", project: "BioSynth — real-time protein engineering interface", date: "Jun 2026", linkedinUrl: "https://linkedin.com/in/aria-nakamura" },
  { id: "w2", name: "Leo Restrepo", hackathon: "ETHGlobal SF", project: "ZKBridge — zero-knowledge cross-chain settlements", date: "May 2026", linkedinUrl: "https://linkedin.com/in/leo-restrepo" },
  { id: "w3", name: "Farah Al-Rashid", hackathon: "TreeHacks (Stanford)", project: "GridMind — ML-driven power grid optimization", date: "Apr 2026", linkedinUrl: "https://linkedin.com/in/farah-al-rashid" },
  { id: "w4", name: "Dmitri Volkov", hackathon: "Hack-Nation Global AI", project: "SentinelAI — adversarial attack detection for LLMs", date: "Jul 2026", linkedinUrl: "https://linkedin.com/in/dmitri-volkov" },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"founders" | "events" | "winners">("founders");
  const [nlQuery, setNlQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [university, setUniversity] = useState("");
  const [credentials, setCredentials] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [events, setEvents] = useState<FounderEvent[] | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function nlqSearch() {
    if (!nlQuery.trim()) return;
    setBusy(true);
    setError(null);
    setInterpretation(null);
    try {
      const res = await fetch("/api/discover/nlq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: nlQuery }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "search failed");
      setCandidates(data.candidates);
      setInterpretation(data.interpretation);
      setTab("founders");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function structuredSearch() {
    setBusy(true);
    setError(null);
    setInterpretation(null);
    try {
      const [candidateRes, eventRes] = await Promise.all([
        fetch("/api/discover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            industry: industry || undefined,
            geography: geography || undefined,
            university: university || undefined,
            credentials: credentials || undefined,
          }),
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

  const noFilters = !industry && !geography && !university && !credentials;

  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">discover</p>
        <h1 className="serif text-[28px]">Find founders before anyone else does</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--muted)]">
          Search live against GitHub, arXiv, patents, and hackathon records. Nothing saved until you screen someone.
        </p>
      </div>

      <div className="card-paper p-5">
        <p className="label mb-2">ask viscosity — natural language search</p>
        <div className="flex gap-2">
          <textarea
            className="input min-h-[60px] flex-1"
            placeholder="Show me robotics PhD students from Carnegie Mellon who've published in the last two years and contributed to open source..."
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); nlqSearch(); } }}
          />
          <button className="btn self-end" disabled={busy || !nlQuery.trim()} onClick={nlqSearch}>
            {busy ? "searching..." : "ask"}
          </button>
        </div>
        {interpretation && (
          <p className="mt-2 text-[12px] text-[var(--accent)]">{interpretation}</p>
        )}
      </div>

      <div className="card-paper p-5">
        <p className="label mb-2">or use structured filters</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <input className="input" placeholder="industry (e.g. robotics)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <input className="input" placeholder="geography (e.g. SF)" value={geography} onChange={(e) => setGeography(e.target.value)} />
          <input className="input" placeholder="university (e.g. MIT)" value={university} onChange={(e) => setUniversity(e.target.value)} />
          <input className="input" placeholder="credentials (e.g. PhD, YC, FAANG)" value={credentials} onChange={(e) => setCredentials(e.target.value)} />
          <button className="btn" disabled={busy || noFilters} onClick={structuredSearch}>
            {busy ? "..." : "search"}
          </button>
        </div>
      </div>

      {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

      <div className="card-paper flex w-fit gap-1 p-1.5">
        <button className={`pill-tab ${tab === "founders" ? "active" : ""}`} onClick={() => setTab("founders")}>
          founders{candidates ? ` (${candidates.length})` : ""}
        </button>
        <button className={`pill-tab ${tab === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
          events{events ? ` (${events.length})` : ""}
        </button>
        <button className={`pill-tab ${tab === "winners" ? "active" : ""}`} onClick={() => setTab("winners")}>
          hackathon winners
        </button>
      </div>

      {tab === "founders" && (
        <>
          {candidates && candidates.length === 0 && (
            <div className="card-paper p-8 text-center">
              <p className="label">no candidates matched — try a broader query or different filters</p>
            </div>
          )}
          {!candidates && (
            <div className="card-paper p-8 text-center">
              <p className="label">use the search above to find founders</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {candidates?.map((c) => (
              <div key={c.id} className="card-paper flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-medium">{c.name}</p>
                  <span className={`badge ${SOURCE_BADGE[c.sourceKind] ?? "badge-gray"}`}>{c.sourceKind}</span>
                </div>
                <p className="text-[13px] text-[var(--muted)] line-clamp-2">{c.headline}</p>
                <div className="flex items-center justify-between mt-auto">
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="label link-green">
                    source &rarr;
                  </a>
                  <button className="btn text-[11px] px-3 py-1.5" onClick={() => screenCandidate(c)}>
                    screen &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "events" && (
        <>
          {events && events.length === 0 && (
            <div className="card-paper p-8 text-center">
              <p className="label">no events matched — try broader filters</p>
            </div>
          )}
          {!events && (
            <div className="card-paper p-8 text-center">
              <p className="label">run a search to find upcoming events</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
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
                  </p>
                  <a href={e.url} target="_blank" rel="noreferrer" className="label link-green mt-1 inline-block">
                    event page &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "winners" && (
        <>
          <p className="label -mt-2">recent hackathon winners worldwide — potential founders to watch</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MOCK_WINNERS.map((w) => (
              <div key={w.id} className="card-paper p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-medium">{w.name}</p>
                    <a href={w.linkedinUrl} target="_blank" rel="noreferrer" className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0a66c2] transition-transform hover:scale-110">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  </div>
                  <span className="badge badge-amber">{w.date}</span>
                </div>
                <p className="mt-2 text-[13px] font-medium">{w.project}</p>
                <p className="label mt-1">{w.hackathon}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
