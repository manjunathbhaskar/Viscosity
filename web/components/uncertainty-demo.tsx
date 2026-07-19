"use client";

import { useEffect, useState } from "react";

// Proves the "honest interval, not a bare number" claim visually in ~3
// seconds: starts at a wide, near-uninformative interval (zero data), then
// squeezes down to a tight range as a simulated ingestion line plays —
// mirroring what lib/scoring/cold-start.ts actually does as claims arrive.
const STAGES = [
  { low: 20, high: 95, label: "zero data — neutral prior, wide interval by design", ingesting: false },
  { low: 20, high: 95, label: "[Ingesting GitHub footprint…]", ingesting: true },
  { low: 55, high: 88, label: "[12 process signals found]", ingesting: true },
  { low: 78, high: 83, label: "founder: 12 process signals (cold-start path)", ingesting: false },
];

export default function UncertaintyDemo() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStageIdx(1), 900),
      setTimeout(() => setStageIdx(2), 2000),
      setTimeout(() => setStageIdx(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stage = STAGES[stageIdx];

  return (
    <div className="card-paper p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">founder axis — live interval</span>
        {stage.ingesting && <span className="mono text-[10.5px] text-[var(--accent-dark)]">{stage.label}</span>}
        {!stage.ingesting && stageIdx === 3 && <span className="badge badge-green">confidence 85%</span>}
      </div>
      <div className="relative h-2.5 rounded-full bg-[var(--faint)]">
        <div
          className="absolute h-2.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-700 ease-out"
          style={{ left: `${stage.low}%`, width: `${stage.high - stage.low}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="mono text-[10.5px] text-[var(--muted)]">{stage.low}</span>
        <span className="mono text-[10.5px] text-[var(--muted)]">{stage.high}</span>
      </div>
      {!stage.ingesting && (
        <p className="mt-2 text-[12px] text-[var(--muted)]">{stage.label}</p>
      )}
    </div>
  );
}
