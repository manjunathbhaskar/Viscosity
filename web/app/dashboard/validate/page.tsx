"use client";

import { useEffect, useState } from "react";

interface PredictionRow {
  dealId: string;
  founderName: string;
  companyName: string;
  predictedAt: string;
  axisScore: {
    founder: { score: number; low: number; high: number };
    market: { score: number; low: number; high: number };
    ideaVsMarket: { score: number; low: number; high: number };
  };
  compositeRankHint: number;
}

// Self-validation harness — TIER 2, and this page says so plainly rather
// than dressing it up. Every sourced deal's prediction gets logged here
// automatically, before any outcome is known. What's missing is real ground
// truth: real announced placements to diff against. See
// lib/self-validation.ts for the (real, working) comparison math this would
// feed once that data exists.
export default function ValidatePage() {
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/validate")
      .then((r) => r.json())
      .then((data) => setPredictions(data.predictions ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">self-validation harness · tier 2</p>
        <h1 className="serif text-[28px]">Prediction log</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--muted)]">
          Every sourced deal&apos;s score is logged here, timestamped before any outcome is known.
          Diffing against real announced results isn&apos;t wired up yet.
        </p>
      </div>

      {loading && <p className="label">loading…</p>}
      {!loading && predictions.length === 0 && (
        <div className="card-paper p-8 text-center">
          <p className="label">no predictions logged yet — source a deal to populate this log</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {predictions.map((p) => (
          <div key={p.dealId} className="card-paper grid grid-cols-5 items-center gap-3 p-4">
            <div className="col-span-2">
              <p className="text-[14px] font-medium">{p.founderName}</p>
              <p className="label">{p.companyName}</p>
            </div>
            <div>
              <p className="text-[13px]">{p.axisScore.founder.score}</p>
              <p className="label">founder</p>
            </div>
            <div>
              <p className="text-[13px]">{p.axisScore.market.score}</p>
              <p className="label">market</p>
            </div>
            <div className="text-right">
              <p className="label">logged {new Date(p.predictedAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
