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

const SOURCE_BADGE: Record<string, string> = { github: "badge-green", paper: "badge-amber" };

export default function DiscoverPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [university, setUniversity] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          industry: industry || undefined,
          geography: geography || undefined,
          university: university || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "search failed");
      setCandidates(data.candidates);
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
        <h1 className="serif text-[28px]">Find founders before anyone sources them</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--muted)]">
          Filters run live against GitHub and arXiv — not just what&apos;s already in your Memory layer.
          Nothing here is saved or scored until you explicitly choose to screen someone.
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
    </div>
  );
}
