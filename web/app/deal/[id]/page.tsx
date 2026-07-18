"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface AxisScore {
  score: number;
  low: number;
  high: number;
  trend: string;
  confidence: number;
  basis: string;
}

interface DealDetail {
  deal: { id: string; stage: string; route: string; diligenceDocId?: number };
  founder: { id: string; name: string } | null;
  company: { id: string; name: string; oneLiner?: string } | null;
  claims: { id: string; text: string; confidence: number; sourceId: string }[];
  sources: { id: string; url: string; kind: string }[];
  scoreRecord: { latest: { founder: AxisScore; market: AxisScore; ideaVsMarket: AxisScore }; repetitions: number; easeFactor: number } | null;
  trustScores: { claimId: string; confidence: number; level: string; components: { dataVolume: number; dataCleanliness: number; signalAgreement: number } }[];
  dealbreakers: { id: string; type: string; severity: string; message: string }[];
  traceability: { id: string; conclusion: string; sourceUrls: string[]; agent: string; diligenceSignalType?: string }[];
  memo: { id: string; sections: { section: string; mandatory: boolean; rendered: boolean; body: string }[]; gaps: { field: string; note: string }[] } | null;
}

function AxisCard({ label, axis }: { label: string; axis: AxisScore }) {
  return (
    <div className="card-paper p-4">
      <p className="label mb-1">{label}</p>
      <p className="serif text-[30px] leading-none">{axis.score}</p>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        interval {axis.low}–{axis.high} · trend {axis.trend} · confidence {Math.round(axis.confidence * 100)}%
      </p>
      <p className="mt-2 text-[12.5px]">{axis.basis}</p>
    </div>
  );
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-red",
  high: "badge-red",
  medium: "badge-amber",
  low: "badge-gray",
};

const TRUST_BADGE: Record<string, string> = { high: "badge-green", medium: "badge-amber", low: "badge-red" };

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DealDetail | null>(null);
  const [generatingMemo, setGeneratingMemo] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/deals/${params.id}`);
    const json = await res.json();
    setData(json);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateMemo() {
    setGeneratingMemo(true);
    try {
      await fetch("/api/memo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealId: params.id }) });
      await load();
    } finally {
      setGeneratingMemo(false);
    }
  }

  if (!data) return <p className="label">loading…</p>;
  if (!data.founder || !data.company) return <p className="label">deal not found</p>;

  const sourceUrl = (sourceId: string) => data.sources.find((s) => s.id === sourceId)?.url;

  return (
    <div className="rise flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="label mb-1">{data.deal.route} · {data.deal.stage.replace("_", " ")}</p>
          <h1 className="serif text-[30px]">{data.founder.name}</h1>
          <p className="text-[14px] text-[var(--muted)]">{data.company.name}{data.company.oneLiner ? ` — ${data.company.oneLiner}` : ""}</p>
        </div>
        <button className="btn" onClick={generateMemo} disabled={generatingMemo}>
          {generatingMemo ? "generating…" : data.memo ? "regenerate memo" : "generate memo"}
        </button>
      </div>

      {data.scoreRecord && (
        <section>
          <p className="label mb-3">3-axis score — independent, never averaged</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AxisCard label="founder" axis={data.scoreRecord.latest.founder} />
            <AxisCard label="market" axis={data.scoreRecord.latest.market} />
            <AxisCard label="idea vs. market" axis={data.scoreRecord.latest.ideaVsMarket} />
          </div>
          <p className="label mt-2">
            memory: {data.scoreRecord.repetitions} corroborating repetition{data.scoreRecord.repetitions === 1 ? "" : "s"}, ease factor{" "}
            {data.scoreRecord.easeFactor.toFixed(2)}
          </p>
        </section>
      )}

      {data.dealbreakers.length > 0 && (
        <section>
          <p className="label mb-3">dealbreaker scanner</p>
          <div className="flex flex-col gap-2">
            {data.dealbreakers.map((d) => (
              <div key={d.id} className="card-paper flex items-center justify-between p-3">
                <p className="text-[13px]">{d.message}</p>
                <span className={`badge ${SEVERITY_BADGE[d.severity] ?? "badge-gray"}`}>{d.severity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="label mb-3">claims &amp; trust score — per claim, not per company</p>
        <div className="flex flex-col gap-2">
          {data.claims.map((c) => {
            const trust = data.trustScores.find((t) => t.claimId === c.id);
            const url = sourceUrl(c.sourceId);
            return (
              <div key={c.id} className="card-paper p-3">
                <p className="text-[13px]">{c.text}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="label link-green">
                      source →
                    </a>
                  )}
                  {trust && (
                    <span className={`badge ${TRUST_BADGE[trust.level]}`}>
                      trust {Math.round(trust.confidence * 100)}% · vol {Math.round(trust.components.dataVolume * 100)}% · clean{" "}
                      {Math.round(trust.components.dataCleanliness * 100)}% · agree {Math.round(trust.components.signalAgreement * 100)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {data.claims.length === 0 && <p className="label">no claims yet</p>}
        </div>
      </section>

      <section>
        <p className="label mb-3">agentic traceability log</p>
        <div className="flex flex-col gap-2">
          {data.traceability.map((t) => (
            <div key={t.id} className="card-paper p-3">
              <p className="text-[13px]">{t.conclusion}</p>
              <p className="label mt-1">
                {t.agent}
                {t.diligenceSignalType ? ` · bridged to diligence signal: ${t.diligenceSignalType}` : ""} ·{" "}
                {t.sourceUrls.length} source{t.sourceUrls.length === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {data.memo && (
        <section>
          <p className="label mb-3">investment memo</p>
          <div className="flex flex-col gap-3">
            {data.memo.sections.filter((s) => s.mandatory || s.rendered).map((s) => (
              <div key={s.section} className="card-paper p-4">
                <p className="label mb-1">
                  {s.section.replace(/_/g, " ")} {s.mandatory ? "· mandatory" : "· optional"}
                </p>
                <pre className="draft">{s.body}</pre>
              </div>
            ))}
            {data.memo.gaps.length > 0 && (
              <div className="card-dark p-4">
                <p className="label mb-2 text-[#c9c8c2]">gap flags — not disclosed, not fabricated</p>
                {data.memo.gaps.map((g, i) => (
                  <p key={i} className="text-[13px]">
                    {g.note}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
