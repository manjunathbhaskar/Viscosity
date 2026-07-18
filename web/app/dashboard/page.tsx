"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScoreArc from "@/components/score-arc";
import PipelineStage from "@/components/pipeline-stage";
import RankBadge from "@/components/rank-badge";
import type { DealStage, Trend } from "@/lib/types";

interface AxisScore {
  score: number;
  low: number;
  high: number;
  trend: Trend;
  confidence: number;
  basis: string;
}

interface DealRow {
  id: string;
  founderName: string;
  companyName: string;
  stage: DealStage;
  route: string;
  axisScore: {
    founder: AxisScore;
    market: AxisScore;
    ideaVsMarket: AxisScore;
  } | null;
  criticalDealbreakers: number;
  redFlagScore: { score: number; trafficLight: "red" | "amber" | "green"; verdict: string } | null;
  updatedAt: string;
}

const TRAFFIC_BADGE: Record<string, string> = { red: "badge-red", amber: "badge-amber", green: "badge-green" };

function compositeScore(row: DealRow): number {
  if (!row.axisScore) return 0;
  const { founder, market, ideaVsMarket } = row.axisScore;
  return Math.round(Math.pow(founder.score * market.score * ideaVsMarket.score, 1 / 3));
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

  const ranked = [...deals].sort((a, b) => compositeScore(b) - compositeScore(a));

  const stageCounts = deals.reduce(
    (acc, d) => {
      acc[d.stage] = (acc[d.stage] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

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

      <div className="flex gap-4">
        <div className="card-paper flex items-center gap-2 px-3 py-2">
          <span className="serif text-[20px]">{deals.length}</span>
          <span className="label">total</span>
        </div>
        {Object.entries(stageCounts).map(([stage, count]) => (
          <div key={stage} className="card-paper flex items-center gap-2 px-3 py-2">
            <span className="serif text-[20px]">{count}</span>
            <span className="label">{stage.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {loading && <p className="label">loading...</p>}
      {!loading && deals.length === 0 && (
        <div className="card-paper p-8 text-center">
          <p className="label">no deals yet - source one to get started</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {ranked.map((d, idx) => (
          <Link
            key={d.id}
            href={`/deal/${d.id}`}
            className={`card grid grid-cols-[40px_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 p-4 rise rise-delay-${Math.min(idx + 1, 6)}`}
          >
            <RankBadge rank={idx + 1} />

            <div>
              <p className="text-[14px] font-medium">{d.founderName}</p>
              <p className="label">{d.companyName}</p>
            </div>

            {d.axisScore ? (
              <>
                <ScoreArc
                  score={d.axisScore.founder.score}
                  low={d.axisScore.founder.low}
                  high={d.axisScore.founder.high}
                  label="founder"
                  trend={d.axisScore.founder.trend}
                  size="sm"
                />
                <ScoreArc
                  score={d.axisScore.market.score}
                  low={d.axisScore.market.low}
                  high={d.axisScore.market.high}
                  label="market"
                  trend={d.axisScore.market.trend}
                  size="sm"
                />
                <ScoreArc
                  score={d.axisScore.ideaVsMarket.score}
                  low={d.axisScore.ideaVsMarket.low}
                  high={d.axisScore.ideaVsMarket.high}
                  label="fit"
                  trend={d.axisScore.ideaVsMarket.trend}
                  size="sm"
                />
              </>
            ) : (
              <>
                <span className="label">-</span>
                <span className="label">-</span>
                <span className="label">-</span>
              </>
            )}

            <div className="flex flex-col items-end gap-1.5">
              <PipelineStage stage={d.stage} compact />
              {d.redFlagScore && (
                <span className={`badge ${TRAFFIC_BADGE[d.redFlagScore.trafficLight]}`}>
                  rf {d.redFlagScore.score}
                </span>
              )}
              {d.criticalDealbreakers > 0 && (
                <span className="badge badge-red">{d.criticalDealbreakers} db</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
