"use client";

import { useState } from "react";

interface DigestResult {
  filters: { industry?: string; geography?: string; university?: string };
  generatedAt: string;
  entries: { candidateName: string; blurb: string; sourceUrl: string }[];
  subjectLine: string;
  bodyText: string;
}

export default function DigestPage() {
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("");
  const [university, setUniversity] = useState("");
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          industry: industry || undefined,
          geography: geography || undefined,
          university: university || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "generation failed");
      setDigest(data.digest);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyToClipboard() {
    if (!digest) return;
    await navigator.clipboard.writeText(`${digest.subjectLine}\n\n${digest.bodyText}`);
    setCopied(true);
  }

  const noFilters = !industry && !geography && !university;

  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">monthly digest · tier 2 — preview only</p>
        <h1 className="serif text-[28px]">Digest preview</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--muted)]">
          Composes a real, written digest from a live Discover search on your watchlist filters. This does not
          send anything — it&apos;s a preview you can copy. Wiring an actual monthly send needs an email provider
          and your explicit go-ahead each time.
        </p>
      </div>

      <div className="card-paper grid gap-3 p-5 sm:grid-cols-4">
        <input className="input" placeholder="industry (e.g. robotics)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <input className="input" placeholder="geography (e.g. San Francisco)" value={geography} onChange={(e) => setGeography(e.target.value)} />
        <input className="input" placeholder="university (e.g. MIT)" value={university} onChange={(e) => setUniversity(e.target.value)} />
        <button className="btn" disabled={busy || noFilters} onClick={generate}>
          {busy ? "generating…" : "generate digest"}
        </button>
      </div>

      {error && <p className="text-[13px] text-[var(--red)]">{error}</p>}

      {digest && (
        <div className="card-paper p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-medium">{digest.subjectLine}</p>
            <button className="btn btn-ghost" onClick={copyToClipboard}>
              {copied ? "copied ✓" : "copy to clipboard"}
            </button>
          </div>
          <pre className="draft">{digest.bodyText}</pre>
          <p className="label mt-3">generated {new Date(digest.generatedAt).toLocaleString()} — not sent anywhere</p>
        </div>
      )}
    </div>
  );
}
