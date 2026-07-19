"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { DealStage, Trend } from "@/lib/types";

interface AxisScore {
  score: number;
  low: number;
  high: number;
  trend: Trend;
  confidence: number;
  basis: string;
}

interface Axis {
  score: number;
  low: number;
  high: number;
  confidence: number;
}

interface DealRow {
  id: string;
  founderName: string;
  companyName: string;
  stage: DealStage;
  route: string;
  axisScore: { founder: Axis; market: Axis; ideaVsMarket: Axis } | null;
  avgConfidence: number;
  criticalDealbreakers: number;
  redFlagScore: { score: number; trafficLight: "red" | "amber" | "green"; verdict: string } | null;
  latestTraceability: { conclusion: string; sourceCount: number } | null;
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
const TRAFFIC_COLOR: Record<string, string> = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)" };

function MiniBar({ label, axis }: { label: string; axis: Axis | undefined }) {
  if (!axis) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="label w-14 shrink-0">{label}</span>
      <div className="meter-track flex-1">
        <div className="meter-fill" style={{ width: `${axis.score}%` }} />
      </div>
      <span className="mono w-6 shrink-0 text-right text-[11px] text-[var(--muted)]">{axis.score}</span>
    </div>
  );
}

function TrustRing({ pct }: { pct: number }) {
  const color = pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--amber)" : "var(--red)";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 34, height: 34 }}>
      <div className="ring" style={{ width: 34, height: 34, ["--pct" as string]: pct, ["--ring-color" as string]: color }} />
      <span className="ring-label" style={{ fontSize: 9 }}>
        {pct}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [routeFilter, setRouteFilter] = useState("all");
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(data.deals ?? []))
      .finally(() => setLoading(false));
  }, []);

  const stages = useMemo(() => Array.from(new Set(deals.map((d) => d.stage))), [deals]);

  const filtered = deals.filter((d) => {
    if (stageFilter !== "all" && d.stage !== stageFilter) return false;
    if (routeFilter !== "all" && d.route !== routeFilter) return false;
    if (d.avgConfidence < minConfidence) return false;
    if (search && !`${d.founderName} ${d.companyName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="rise flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label mb-1">decision-ready queue</p>
          <h1 className="serif text-[28px]">Deals</h1>
        </div>
        <Link href="/dashboard/source" className="btn">
          + source a founder
        </Link>
      </div>

      <div className="card-paper flex flex-wrap items-center gap-3 p-3">
        <input className="input max-w-[220px]" placeholder="search founder or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-[160px]" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">all stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select className="input max-w-[160px]" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
          <option value="all">all routes</option>
          <option value="inbound">inbound</option>
          <option value="outbound">outbound</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="label whitespace-nowrap">min confidence {minConfidence}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-28 accent-[var(--accent)]"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-44 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="card-paper p-8 text-center">
          <p className="label">{deals.length === 0 ? "no deals yet — source one to get started" : "no deals match these filters"}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d) => (
          <Link key={d.id} href={`/deal/${d.id}`} className="card group relative flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[14.5px] font-medium">{d.founderName}</p>
                <p className="label">{d.companyName}</p>
              </div>
              <TrustRing pct={d.avgConfidence} />
            </div>

            {d.axisScore && (
              <div className="flex flex-col gap-1.5">
                <MiniBar label="founder" axis={d.axisScore.founder} />
                <MiniBar label="market" axis={d.axisScore.market} />
                <MiniBar label="idea×mkt" axis={d.axisScore.ideaVsMarket} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`badge ${STAGE_BADGE[d.stage] ?? "badge-gray"}`}>{d.stage.replace("_", " ")}</span>
              <span className="badge badge-gray">{d.route}</span>
              {d.redFlagScore && (
                <span className={`badge ${TRAFFIC_BADGE[d.redFlagScore.trafficLight]}`} style={{ boxShadow: `inset 0 0 0 1px ${TRAFFIC_COLOR[d.redFlagScore.trafficLight]}22` }}>
                  red flag {d.redFlagScore.score}
                </span>
              )}
              {d.criticalDealbreakers > 0 && (
                <span className="badge badge-red">{d.criticalDealbreakers} db</span>
              )}
            </div>

            {d.latestTraceability && (
              <div className="pointer-events-none absolute inset-x-4 bottom-3 translate-y-1 rounded-lg bg-[var(--card-deep)]/95 p-2.5 opacity-0 shadow-lg backdrop-blur transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="line-clamp-2 text-[11.5px] text-[var(--ink)]">{d.latestTraceability.conclusion}</p>
                <p className="label mt-1">{d.latestTraceability.sourceCount} source{d.latestTraceability.sourceCount === 1 ? "" : "s"}</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
