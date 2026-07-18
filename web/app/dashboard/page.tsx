"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DealRow {
  id: string;
  founderName: string;
  companyName: string;
  stage: string;
  route: string;
  axisScore: {
    founder: { score: number; low: number; high: number };
    market: { score: number; low: number; high: number };
    ideaVsMarket: { score: number; low: number; high: number };
  } | null;
  criticalDealbreakers: number;
  redFlagScore: { score: number; trafficLight: "red" | "amber" | "green"; verdict: string } | null;
  updatedAt: string;
}

const STAGE_BADGE: Record<string, string> = {
  sourced: "badge-gray",
  screening: "badge-amber",
  diligence: "badge-amber",
  decision_ready: "badge-green",
  passed: "badge-gray",
  invested: "badge-green",
};

const TRAFFIC_BADGE: Record<string, string> = { red: "badge-red", amber: "badge-amber", green: "badge-green" };

function AxisCell({ label, axis }: { label: string; axis: { score: number; low: number; high: number } | undefined }) {
  if (!axis) return <span className="label">—</span>;
  return (
    <div>
      <p className="text-[13px]">{axis.score}</p>
      <p className="label">{label} · {axis.low}-{axis.high}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(data.deals ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rise flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="label mb-1">decision-ready queue</p>
          <h1 className="serif text-[28px]">Deals</h1>
        </div>
        <Link href="/dashboard/source" className="btn">
          + source a founder
        </Link>
      </div>

      {loading && <p className="label">loading…</p>}
      {!loading && deals.length === 0 && (
        <div className="card-paper p-8 text-center">
          <p className="label">no deals yet — source one to get started</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {deals.map((d) => (
          <Link key={d.id} href={`/deal/${d.id}`} className="card grid grid-cols-6 items-center gap-3 p-4">
            <div className="col-span-2">
              <p className="text-[14px] font-medium">{d.founderName}</p>
              <p className="label">{d.companyName}</p>
            </div>
            <AxisCell label="founder" axis={d.axisScore?.founder} />
            <AxisCell label="market" axis={d.axisScore?.market} />
            <AxisCell label="idea×market" axis={d.axisScore?.ideaVsMarket} />
            <div className="flex flex-col items-end gap-1.5">
              <span className={`badge ${STAGE_BADGE[d.stage] ?? "badge-gray"}`}>{d.stage.replace("_", " ")}</span>
              {d.redFlagScore && (
                <span className={`badge ${TRAFFIC_BADGE[d.redFlagScore.trafficLight]}`}>
                  red flag {d.redFlagScore.score}
                </span>
              )}
              {d.criticalDealbreakers > 0 && <span className="badge badge-red">{d.criticalDealbreakers} dealbreaker</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
