"use client";

import { useEffect, useState } from "react";

interface Explorer {
  counts: Record<string, number>;
  founders: { id: string; name: string; companyIds: number; sourceIds: number; updatedAt: string }[];
  deals: { id: string; founder: string; company: string; stage: string; route: string }[];
  claims: { id: string; text: string; confidence: number; subjectType: string }[];
  trustScores: { claimId: string; confidence: number; level: string }[];
  simulations: { id: string; topic: string; status: string; provider: string; feedCount: number; createdAt: string }[];
  momentumPlans: { id: string; summary: string; horizonDays: number; actionCount: number; source: string }[];
}

const LEVEL_BADGE: Record<string, string> = { high: "badge-green", medium: "badge-amber", low: "badge-red" };

function Table({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="card-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13.5px] font-medium">{title}</p>
        <span className="badge badge-gray">{count} total</span>
      </div>
      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">{children}</div>
    </div>
  );
}

export default function MemoryPage() {
  const [data, setData] = useState<Explorer | null>(null);

  useEffect(() => {
    fetch("/api/memory-explorer")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">memory layer · read-only</p>
        <h1 className="serif text-[28px]">Memory Explorer</h1>
        <p className="mt-2 max-w-xl text-[13.5px] text-[var(--muted)]">
          Raw, capped read of the persistent Memory store — debugging/ops.
        </p>
      </div>

      {!data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.counts).map(([k, v]) => (
              <span key={k} className="badge badge-gray">
                {k}: {v}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Table title="founders" count={data.counts.founders}>
              {data.founders.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <span className="text-[12.5px]">{f.name}</span>
                  <span className="label">{f.sourceIds} sources</span>
                </div>
              ))}
              {data.founders.length === 0 && <p className="label">empty</p>}
            </Table>

            <Table title="deals" count={data.counts.deals}>
              {data.deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <span className="text-[12.5px]">
                    {d.founder} · {d.company}
                  </span>
                  <span className="badge badge-gray">{d.stage.replace("_", " ")}</span>
                </div>
              ))}
              {data.deals.length === 0 && <p className="label">empty</p>}
            </Table>

            <Table title="claims" count={data.counts.claims}>
              {data.claims.map((c) => (
                <div key={c.id} className="rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <p className="text-[12px]">{c.text}…</p>
                  <p className="label mt-0.5">
                    {c.subjectType} · confidence {Math.round(c.confidence * 100)}%
                  </p>
                </div>
              ))}
              {data.claims.length === 0 && <p className="label">empty</p>}
            </Table>

            <Table title="trust scores" count={data.counts.trustScores}>
              {data.trustScores.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <span className="mono text-[11px] text-[var(--muted)]">{t.claimId}</span>
                  <span className={`badge ${LEVEL_BADGE[t.level] ?? "badge-gray"}`}>{Math.round(t.confidence * 100)}%</span>
                </div>
              ))}
              {data.trustScores.length === 0 && <p className="label">empty</p>}
            </Table>

            <Table title="simulations" count={data.counts.simulations}>
              {data.simulations.map((s) => (
                <div key={s.id} className="rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <p className="text-[12px]">{s.topic}</p>
                  <p className="label mt-0.5">
                    {s.provider} · {s.status} · {s.feedCount} feed events
                  </p>
                </div>
              ))}
              {data.simulations.length === 0 && <p className="label">empty</p>}
            </Table>

            <Table title="momentum plans" count={data.counts.momentumPlans}>
              {data.momentumPlans.map((p) => (
                <div key={p.id} className="rounded-lg bg-[var(--card-deep)] px-2.5 py-1.5">
                  <p className="text-[12px]">{p.summary}</p>
                  <p className="label mt-0.5">
                    {p.horizonDays}d · {p.actionCount} actions · {p.source}
                  </p>
                </div>
              ))}
              {data.momentumPlans.length === 0 && <p className="label">empty</p>}
            </Table>
          </div>

          <div className="card-paper p-4">
            <p className="text-[13px]">
              Full per-deal evidence lives in each deal&apos;s Evidence and Traceability tabs — open one from the{" "}
              <a href="/dashboard" className="link-green">
                deals queue
              </a>
              .
            </p>
          </div>
        </>
      )}
    </div>
  );
}
