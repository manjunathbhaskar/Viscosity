"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ScoreArc from "@/components/score-arc";
import PipelineStage from "@/components/pipeline-stage";
import TrustMeter from "@/components/trust-meter";
import VoicePlayer from "@/components/voice-player";
import type { DealStage, Trend, TrustLevel } from "@/lib/types";

interface AxisScore {
  score: number;
  low: number;
  high: number;
  trend: Trend;
  confidence: number;
  basis: string;
}

interface DealDetail {
  deal: {
    id: string;
    stage: DealStage;
    route: string;
    diligenceDocId?: number;
    redFlagScore?: { score: number; trafficLight: "red" | "amber" | "green"; verdict: string };
    thesisFit?: { fits: boolean; score: number; reasons: string[] };
    validatorFindings?: { check: string; passed: boolean; detail: string }[];
  };
  founder: { id: string; name: string } | null;
  company: { id: string; name: string; oneLiner?: string } | null;
  claims: { id: string; text: string; confidence: number; sourceId: string }[];
  sources: { id: string; url: string; kind: string }[];
  scoreRecord: { latest: { founder: AxisScore; market: AxisScore; ideaVsMarket: AxisScore }; repetitions: number; easeFactor: number } | null;
  trustScores: { claimId: string; confidence: number; level: TrustLevel; components: { dataVolume: number; dataCleanliness: number; signalAgreement: number } }[];
  dealbreakers: { id: string; type: string; severity: string; message: string }[];
  traceability: { id: string; conclusion: string; sourceUrls: string[]; agent: string; diligenceSignalType?: string }[];
  memo: { id: string; sections: { section: string; mandatory: boolean; rendered: boolean; body: string }[]; gaps: { field: string; note: string }[] } | null;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-red",
  high: "badge-red",
  medium: "badge-amber",
  low: "badge-gray",
};

const TRAFFIC_BADGE: Record<string, string> = { red: "badge-red", amber: "badge-amber", green: "badge-green" };

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DealDetail | null>(null);
  const [generatingMemo, setGeneratingMemo] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/deals/${params.id}`);
    const json = await res.json();
    setData(json);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function generateMemo() {
    setGeneratingMemo(true);
    try {
      await fetch("/api/memo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dealId: params.id }) });
      await load();
    } finally {
      setGeneratingMemo(false);
    }
  }

  if (!data) return <p className="label p-8">loading...</p>;
  if (!data.founder || !data.company) return <p className="label p-8">deal not found</p>;

  const sourceUrl = (sourceId: string) => data.sources.find((s) => s.id === sourceId)?.url;

  return (
    <div className="rise flex flex-col gap-8">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2">
            <PipelineStage stage={data.deal.stage} />
          </div>
          <h1 className="serif text-[30px]">{data.founder.name}</h1>
          <p className="text-[14px] text-[var(--muted)]">
            {data.company.name}
            {data.company.oneLiner ? ` — ${data.company.oneLiner}` : ""}
          </p>
          <p className="label mt-1">{data.deal.route} route</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={generateMemo} disabled={generatingMemo}>
            {generatingMemo ? "generating..." : data.memo ? "regenerate memo" : "generate memo"}
          </button>
        </div>
      </div>

      {/* ── 3-Axis Score Arcs ─────────────────────────────────────── */}
      {data.scoreRecord && (
        <section className="rise rise-delay-1">
          <p className="label mb-4">3-axis score - independent, never averaged</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {(["founder", "market", "ideaVsMarket"] as const).map((key) => {
              const axis = data.scoreRecord!.latest[key];
              const label = key === "ideaVsMarket" ? "idea vs. market" : key;
              return (
                <div key={key} className="card-paper flex flex-col items-center gap-3 p-5">
                  <ScoreArc
                    score={axis.score}
                    low={axis.low}
                    high={axis.high}
                    label={label}
                    trend={axis.trend}
                    confidence={axis.confidence}
                    size="lg"
                  />
                  <p className="mt-2 text-center text-[12.5px] text-[var(--muted)]">{axis.basis}</p>
                </div>
              );
            })}
          </div>
          <p className="label mt-2">
            memory: {data.scoreRecord.repetitions} corroborating repetition{data.scoreRecord.repetitions === 1 ? "" : "s"}, ease factor{" "}
            {data.scoreRecord.easeFactor.toFixed(2)}
          </p>
        </section>
      )}

      {/* ── Voice Agent ───────────────────────────────────────────── */}
      <section className="rise rise-delay-2">
        <p className="label mb-3">voice agent</p>
        <VoicePlayer dealId={params.id} />
      </section>

      {/* ── Red Flags & Dealbreakers ──────────────────────────────── */}
      <section className="rise rise-delay-3">
        <p className="label mb-3">diligence - red flag score & dealbreaker scanner</p>
        <div className="flex flex-col gap-2">
          {data.deal.redFlagScore && (
            <div className="card-paper flex items-center justify-between p-4">
              <div>
                <p className="text-[13px]">{data.deal.redFlagScore.verdict}</p>
                <p className="label mt-1">document-risk scan (separate from axis scores)</p>
              </div>
              <span className={`badge ${TRAFFIC_BADGE[data.deal.redFlagScore.trafficLight]}`}>
                red flag {data.deal.redFlagScore.score}/100
              </span>
            </div>
          )}
          {data.dealbreakers.length > 0 ? (
            data.dealbreakers.map((d) => (
              <div key={d.id} className="card-paper flex items-center justify-between p-3">
                <p className="text-[13px]">{d.message}</p>
                <span className={`badge ${SEVERITY_BADGE[d.severity] ?? "badge-gray"}`}>{d.severity}</span>
              </div>
            ))
          ) : (
            <div className="card-paper flex items-center justify-between p-3">
              <p className="text-[13px] text-[var(--muted)]">No critical or high-severity findings.</p>
              <span className="badge badge-green">clean</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Thesis Fit ────────────────────────────────────────────── */}
      {data.deal.thesisFit && (
        <section className="rise rise-delay-4">
          <p className="label mb-3">screening gate - thesis fit</p>
          <div className="card-paper p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`badge ${data.deal.thesisFit.fits ? "badge-green" : "badge-amber"}`}>
                {data.deal.thesisFit.fits ? "fits thesis" : "does not clear the bar"}
              </span>
              <span className="label">soft fit score {Math.round(data.deal.thesisFit.score * 100)}%</span>
            </div>
            <ul className="flex flex-col gap-1">
              {data.deal.thesisFit.reasons.map((r, i) => (
                <li key={i} className="text-[13px] text-[var(--muted)]">{r}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Claims & Trust Scores ─────────────────────────────────── */}
      <section className="rise rise-delay-5">
        <p className="label mb-3">claims & trust score - per claim, not per company</p>
        <div className="flex flex-col gap-2">
          {data.claims.map((c) => {
            const trust = data.trustScores.find((t) => t.claimId === c.id);
            const url = sourceUrl(c.sourceId);
            return (
              <div key={c.id} className="card-paper p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[13px]">{c.text}</p>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="label link-green mt-1 inline-block">
                        source &rarr;
                      </a>
                    )}
                  </div>
                  {trust && (
                    <div className="w-36 flex-shrink-0">
                      <TrustMeter
                        confidence={trust.confidence}
                        components={trust.components}
                        level={trust.level}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {data.claims.length === 0 && <p className="label">no claims yet</p>}
        </div>
      </section>

      {/* ── Traceability Log ──────────────────────────────────────── */}
      <section className="rise rise-delay-6">
        <p className="label mb-3">agentic traceability log</p>
        <div className="flex flex-col gap-2">
          {data.traceability.map((t) => (
            <div key={t.id} className="card-paper p-3">
              <p className="text-[13px]">{t.conclusion}</p>
              <p className="label mt-1">
                {t.agent}
                {t.diligenceSignalType ? ` · bridged: ${t.diligenceSignalType}` : ""} ·{" "}
                {t.sourceUrls.length} source{t.sourceUrls.length === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Self-Correction ───────────────────────────────────────── */}
      {data.deal.validatorFindings && data.deal.validatorFindings.length > 0 && (
        <section>
          <p className="label mb-3">self-correction pass</p>
          <div className="flex flex-col gap-2">
            {data.deal.validatorFindings.map((f, i) => (
              <div key={i} className="card-paper flex items-center justify-between p-3">
                <div>
                  <p className="text-[13px]">{f.detail}</p>
                  <p className="label mt-1">{f.check.replace(/_/g, " ")}</p>
                </div>
                <span className={`badge ${f.passed ? "badge-green" : "badge-red"}`}>{f.passed ? "passed" : "flagged"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Investment Memo ───────────────────────────────────────── */}
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
                <p className="label mb-2 text-[#c9c8c2]">gap flags - not disclosed, not fabricated</p>
                {data.memo.gaps.map((g, i) => (
                  <p key={i} className="text-[13px]">{g.note}</p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
