"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import VoicePlayer from "@/components/voice-player";

interface AxisScore {
  score: number;
  low: number;
  high: number;
  trend: string;
  confidence: number;
  basis: string;
}

interface MomentumAction {
  id: string;
  title: string;
  channel: string;
  rationale: string;
  expectedOutcome: string;
  dueAt?: string;
  linkedSignal?: string;
}

interface MomentumPlan {
  id: string;
  summary: string;
  horizonDays: number;
  actions: MomentumAction[];
  source: "mock" | "momentum-engine";
}

interface ClaimRow {
  id: string;
  text: string;
  confidence: number;
  sourceId: string;
}

interface SourceRow {
  id: string;
  url: string;
  kind: string;
}

interface DealDetail {
  deal: {
    id: string;
    stage: string;
    route: string;
    diligenceDocId?: number;
    redFlagScore?: { score: number; trafficLight: "red" | "amber" | "green"; verdict: string };
    thesisFit?: { fits: boolean; score: number; reasons: string[] };
    validatorFindings?: { check: string; passed: boolean; detail: string }[];
  };
  founder: { id: string; name: string } | null;
  company: { id: string; name: string; oneLiner?: string } | null;
  claims: ClaimRow[];
  sources: SourceRow[];
  scoreRecord: { latest: { founder: AxisScore; market: AxisScore; ideaVsMarket: AxisScore }; repetitions: number; easeFactor: number } | null;
  trustScores: { claimId: string; confidence: number; level: string; components: { dataVolume: number; dataCleanliness: number; signalAgreement: number } }[];
  dealbreakers: { id: string; type: string; severity: string; message: string }[];
  traceability: { id: string; conclusion: string; sourceUrls: string[]; agent: string; diligenceSignalType?: string }[];
  memo: { id: string; sections: { section: string; mandatory: boolean; rendered: boolean; body: string }[]; gaps: { field: string; note: string }[] } | null;
  simulations: SimulationRecord[];
  momentumPlan: MomentumPlan | null;
}

interface SimulationScenario {
  title: string;
  likelihood: number;
  upside: string;
  downside: string;
  turningPoints: string[];
  actions: string[];
  confidence: number;
}

interface SimulationFeedEvent {
  id: string;
  agent: string;
  role: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  text: string;
  url?: string;
}

interface SimulationRecord {
  id: string;
  topic: string;
  status: "queued" | "running" | "succeeded" | "failed";
  provider: "mock" | "swarm";
  scenarios: SimulationScenario[];
  feed: SimulationFeedEvent[];
  activeAgents: string[];
  createdAt: string;
}

const SENTIMENT_BADGE: Record<string, string> = { bullish: "badge-green", bearish: "badge-red", neutral: "badge-amber" };

const SOURCE_KIND_LABEL: Record<string, string> = {
  github: "github",
  launch: "launch",
  web: "web",
  web_pulse: "pulse",
  social_post: "social",
  deck: "deck",
  simulation: "simulation",
  momentum_plan: "influence",
  paper: "paper",
  patent: "patent",
  hackathon: "hackathon",
  accelerator: "accelerator",
  public_profile: "profile",
  interview: "interview",
  diligence_engine: "diligence",
};

const SOURCE_KIND_BADGE: Record<string, string> = {
  github: "badge-gray",
  launch: "badge-amber",
  web: "badge-blue",
  web_pulse: "badge-blue",
  social_post: "badge-blue",
  deck: "badge-gray",
  simulation: "badge-red",
  momentum_plan: "badge-green",
  paper: "badge-gray",
  patent: "badge-gray",
  diligence_engine: "badge-green",
};

function Ring({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="ring"
        style={{ width: size, height: size, ["--pct" as string]: Math.round(pct), ["--ring-color" as string]: color }}
      />
      <span className="ring-label">{Math.round(pct)}</span>
    </div>
  );
}

function Meter({ pct, color = "var(--accent)" }: { pct: number; color?: string }) {
  return (
    <div className="meter-track">
      <div className="meter-fill" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

function AxisCard({ label, axis }: { label: string; axis: AxisScore }) {
  return (
    <div className="card-paper p-4">
      <p className="label mb-1">{label}</p>
      <p className="serif text-[30px] leading-none">{axis.score}</p>
      <div className="my-2">
        <Meter pct={axis.score} />
      </div>
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
const TRUST_RING_COLOR: Record<string, string> = { high: "var(--green)", medium: "var(--amber)", low: "var(--red)" };
const TRAFFIC_BADGE: Record<string, string> = { red: "badge-red", amber: "badge-amber", green: "badge-green" };
const TRAFFIC_COLOR: Record<string, string> = { red: "var(--red)", amber: "var(--amber)", green: "var(--green)" };
const STAGE_BADGE: Record<string, string> = {
  sourced: "badge-gray",
  screening: "badge-amber",
  diligence: "badge-amber",
  decision_ready: "badge-green",
  passed: "badge-gray",
  invested: "badge-green",
};

const TABS = ["summary", "evidence", "traceability", "pulse", "simulation", "influence", "audio"] as const;
type Tab = (typeof TABS)[number];

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DealDetail | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [generatingMemo, setGeneratingMemo] = useState(false);

  const [runningSim, setRunningSim] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simElapsed, setSimElapsed] = useState(0);
  const [attachedConclusions, setAttachedConclusions] = useState<Set<string>>(new Set());

  const [loggedClaims, setLoggedClaims] = useState<Set<string>>(new Set());

  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [doneActions, setDoneActions] = useState<Set<string>>(new Set());
  const [loggedActions, setLoggedActions] = useState<Set<string>>(new Set());

  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");

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

  async function runSimulation() {
    if (!data?.founder || !data.company) return;
    setRunningSim(true);
    setSimError(null);
    setSimElapsed(0);
    const timer = setInterval(() => setSimElapsed((s) => s + 1), 1000);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dealId: params.id,
          topic: `Should we invest in ${data.company.name} at seed stage?`,
          founderName: data.founder.name,
          companyName: data.company.name,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "simulation failed");
      await load();
    } catch (err) {
      setSimError(String(err));
    } finally {
      clearInterval(timer);
      setRunningSim(false);
    }
  }

  async function attachClaimToTraceability(claimId: string, text: string) {
    await fetch("/api/traceability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: params.id,
        conclusion: `Manually attached: ${text.slice(0, 140)}`,
        agent: "manual-review",
        claimIds: [claimId],
      }),
    });
    setLoggedClaims((prev) => new Set(prev).add(claimId));
    await load();
  }

  async function attachScenarioToTraceability(conclusion: string, sourceUrls: string[]) {
    await fetch("/api/traceability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: params.id,
        conclusion: `Swarm scenario: ${conclusion}`,
        agent: "swarm-simulation",
        extraSourceUrls: sourceUrls,
      }),
    });
    setAttachedConclusions((prev) => new Set(prev).add(conclusion));
    await load();
  }

  async function logActionToTraceability(action: MomentumAction) {
    await fetch("/api/traceability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealId: params.id,
        conclusion: `Influence action: ${action.title}`,
        agent: "momentum-plan",
      }),
    });
    setLoggedActions((prev) => new Set(prev).add(action.id));
    await load();
  }

  async function generateMomentumPlan() {
    if (!data?.founder || !data.company) return;
    setGeneratingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/momentum-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: params.id, founderName: data.founder.name, companyName: data.company.name }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "momentum plan failed");
      await load();
    } catch (err) {
      setPlanError(String(err));
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function generateAudio() {
    if (!data?.memo || !data.company) return;
    setGeneratingAudio(true);
    setAudioStatus("generating");
    setAudioError(null);
    try {
      const firstSection = data.memo.sections.find((s) => s.mandatory && s.rendered) ?? data.memo.sections[0];
      // Kept intentionally short — ElevenLabs is billed per character and
      // this build's key runs on a very small quota.
      const text = `${data.company.name}. ${(firstSection?.body ?? "").slice(0, 120)}`;
      const res = await fetch("/api/memo/audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `audio generation failed (${res.status})`);
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
      setAudioStatus("ready");
    } catch (err) {
      setAudioError(String(err));
      setAudioStatus("error");
    } finally {
      setGeneratingAudio(false);
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <div className="shimmer h-8 w-64 rounded-lg" />
        <div className="shimmer h-24 w-full rounded-2xl" />
        <div className="shimmer h-24 w-full rounded-2xl" />
      </div>
    );
  }
  if (!data.founder || !data.company) return <p className="label">deal not found</p>;

  const sourceKind = (sourceId: string) => data.sources.find((s) => s.id === sourceId)?.kind;
  const sourceUrl = (sourceId: string) => data.sources.find((s) => s.id === sourceId)?.url;
  const pulseClaims = data.claims.filter((c) => sourceKind(c.sourceId) === "web_pulse");

  const claimsByKind = new Map<string, ClaimRow[]>();
  for (const c of data.claims) {
    const kind = sourceKind(c.sourceId) ?? "web";
    claimsByKind.set(kind, [...(claimsByKind.get(kind) ?? []), c]);
  }

  const latestSim = data.simulations[0];
  // Minimal "engagement flag" queue: derive high-conviction feed reactions
  // instead of a separate persisted collection — same signal, no new store.
  const engagementFlags = latestSim
    ? latestSim.feed.filter((f) => f.confidence >= 0.7 && f.sentiment !== "neutral")
    : [];

  const avgConfidence = data.scoreRecord
    ? Math.round(
        ((data.scoreRecord.latest.founder.confidence + data.scoreRecord.latest.market.confidence + data.scoreRecord.latest.ideaVsMarket.confidence) / 3) * 100
      )
    : 0;

  return (
    <div className="rise flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className={`badge ${STAGE_BADGE[data.deal.stage] ?? "badge-gray"}`}>{data.deal.stage.replace("_", " ")}</span>
            <p className="label">{data.deal.route}</p>
          </div>
          <h1 className="serif text-[30px]">{data.founder.name}</h1>
          <p className="text-[14px] text-[var(--muted)]">{data.company.name}{data.company.oneLiner ? ` — ${data.company.oneLiner}` : ""}</p>
        </div>

        <div className="flex items-center gap-4">
          {data.scoreRecord && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--faint)] bg-[var(--card-deep)] px-4 py-2.5">
              <div className="text-center">
                <p className="serif text-[18px] leading-none">{data.scoreRecord.latest.founder.score}</p>
                <p className="label mt-0.5">founder</p>
              </div>
              <div className="text-center">
                <p className="serif text-[18px] leading-none">{data.scoreRecord.latest.market.score}</p>
                <p className="label mt-0.5">market</p>
              </div>
              <div className="text-center">
                <p className="serif text-[18px] leading-none">{data.scoreRecord.latest.ideaVsMarket.score}</p>
                <p className="label mt-0.5">idea×mkt</p>
              </div>
              <Ring pct={avgConfidence} color="var(--accent)" size={40} />
            </div>
          )}
          {data.deal.redFlagScore && (
            <Ring pct={100 - data.deal.redFlagScore.score} color={TRAFFIC_COLOR[data.deal.redFlagScore.trafficLight]} size={40} />
          )}
          <button className="btn" onClick={generateMemo} disabled={generatingMemo}>
            {generatingMemo ? "generating…" : data.memo ? "regenerate memo" : "generate memo"}
          </button>
        </div>
      </div>

      <div className="card-paper flex flex-wrap gap-1 p-1.5">
        {TABS.map((t) => (
          <button key={t} className={`pill-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "evidence" && data.claims.length > 0 ? ` (${data.claims.length})` : ""}
            {t === "pulse" && pulseClaims.length > 0 ? ` (${pulseClaims.length})` : ""}
            {t === "simulation" && data.simulations.length > 0 ? ` (${data.simulations.length})` : ""}
            {t === "traceability" && data.traceability.length > 0 ? ` (${data.traceability.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <>
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

          {data.deal.thesisFit && (
            <section>
              <p className="label mb-3">screening gate — thesis fit</p>
              <div className="card-paper p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`badge ${data.deal.thesisFit.fits ? "badge-green" : "badge-amber"}`}>
                    {data.deal.thesisFit.fits ? "fits thesis" : "does not clear the bar"}
                  </span>
                  <span className="label">soft fit score {Math.round(data.deal.thesisFit.score * 100)}%</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {data.deal.thesisFit.reasons.map((r, i) => (
                    <li key={i} className="text-[13px] text-[var(--muted)]">
                      — {r}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section>
            <p className="label mb-3">diligence — red flag score &amp; dealbreaker scanner</p>
            <div className="flex flex-col gap-2">
              {data.deal.redFlagScore && (
                <div className="card-paper flex items-center justify-between p-3">
                  <div>
                    <p className="text-[13px]">{data.deal.redFlagScore.verdict}</p>
                    <p className="label mt-1">
                      from the diligence engine&apos;s document-risk scan — a separate check from the 3-axis score above
                    </p>
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
                  <p className="text-[13px] text-[var(--muted)]">Dealbreaker scan ran — no critical or high-severity findings.</p>
                  <span className="badge badge-green">clean</span>
                </div>
              )}
            </div>
          </section>

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
                    <p className="label mb-2 text-[#e3ddd3]">gap flags — not disclosed, not fabricated</p>
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
        </>
      )}

      {tab === "evidence" && (
        <section className="flex flex-col gap-6">
          <p className="label">evidence — every claim, grouped by source type</p>
          {[...claimsByKind.entries()].map(([kind, claims]) => (
            <div key={kind}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`badge ${SOURCE_KIND_BADGE[kind] ?? "badge-gray"}`}>{SOURCE_KIND_LABEL[kind] ?? kind}</span>
                <span className="label">{claims.length} claim{claims.length === 1 ? "" : "s"}</span>
              </div>
              <div className="flex flex-col gap-2">
                {claims.map((c) => {
                  const trust = data.trustScores.find((t) => t.claimId === c.id);
                  const url = sourceUrl(c.sourceId);
                  const logged = loggedClaims.has(c.id);
                  return (
                    <div key={c.id} className="card-paper p-3">
                      <p className="text-[13px]">{c.text}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="label link-green">
                            source →
                          </a>
                        )}
                        {trust && (
                          <span className={`badge ${TRUST_BADGE[trust.level]}`}>trust {Math.round(trust.confidence * 100)}%</span>
                        )}
                        <button
                          className="btn-ghost ml-auto text-[12px]"
                          onClick={() => attachClaimToTraceability(c.id, c.text)}
                          disabled={logged}
                        >
                          {logged ? "attached ✓" : "attach to traceability"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {data.claims.length === 0 && <p className="label">no claims yet</p>}
        </section>
      )}

      {tab === "traceability" && (
        <section>
          <p className="label mb-3">agentic traceability log — conclusion → claims → sources</p>
          <div className="flex flex-col gap-2">
            {data.traceability.map((t) => (
              <div key={t.id} className="card-paper p-3">
                <p className="text-[13px]">{t.conclusion}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="badge badge-gray">{t.agent}</span>
                  {t.diligenceSignalType && <span className="badge badge-blue">{t.diligenceSignalType}</span>}
                  <span className="label">
                    {t.sourceUrls.length} source{t.sourceUrls.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            ))}
            {data.traceability.length === 0 && <p className="label">no traceability entries yet</p>}
          </div>
        </section>
      )}

      {tab === "pulse" && (
        <section>
          <p className="label mb-3">pulse — live Tavily findings, one query per axis</p>
          <div className="flex flex-col gap-2">
            {pulseClaims.map((c) => {
              const trust = data.trustScores.find((t) => t.claimId === c.id);
              const url = sourceUrl(c.sourceId);
              const logged = loggedClaims.has(c.id);
              return (
                <div key={c.id} className="card-paper p-3">
                  <p className="text-[13px]">{c.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="label link-green">
                        source →
                      </a>
                    )}
                    <div className="flex min-w-[100px] items-center gap-2">
                      <span className="label">relevance</span>
                      <div className="w-16">
                        <Meter pct={c.confidence * 100} color="var(--blue)" />
                      </div>
                    </div>
                    {trust && <span className={`badge ${TRUST_BADGE[trust.level]}`}>trust {Math.round(trust.confidence * 100)}%</span>}
                    <button className="btn-ghost ml-auto text-[12px]" onClick={() => attachClaimToTraceability(c.id, c.text)} disabled={logged}>
                      {logged ? "logged ✓" : "log claim"}
                    </button>
                  </div>
                </div>
              );
            })}
            {pulseClaims.length === 0 && <p className="label">no pulse findings on this deal yet</p>}
          </div>
        </section>
      )}

      {tab === "simulation" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="label">adversarial swarm simulation</p>
            <button className="btn" onClick={runSimulation} disabled={runningSim}>
              {runningSim ? `running… ${simElapsed}s (turbo mode, ~2min)` : data.simulations.length > 0 ? "run again" : "run simulation"}
            </button>
          </div>
          {simError && <p className="mb-2 text-[13px] text-[var(--red)]">{simError}</p>}
          {runningSim && (
            <div className="mb-4 flex items-center gap-2">
              <span className="sentiment-dot live bullish" />
              <p className="label">crawl → kill-shot risk → citizen census → synthesis, running locally on Ollama…</p>
            </div>
          )}
          {data.simulations.length === 0 && !runningSim && (
            <p className="label">no simulation yet — runs the real local swarm, not a mock</p>
          )}

          {engagementFlags.length > 0 && (
            <div className="card-dark mb-4 p-3">
              <p className="label mb-2 text-[#e3ddd3]">
                engagement flags — {engagementFlags.length} high-conviction reaction{engagementFlags.length === 1 ? "" : "s"} (confidence ≥ 70%)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {engagementFlags.map((f) => (
                  <span key={f.id} className={`badge ${SENTIMENT_BADGE[f.sentiment]}`}>
                    {f.agent.slice(0, 28)} · {f.sentiment}
                  </span>
                ))}
              </div>
            </div>
          )}

          {latestSim && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className={`badge ${latestSim.provider === "swarm" ? "badge-green" : "badge-gray"}`}>
                  {latestSim.provider === "swarm" ? "live swarm" : "mock fallback"}
                </span>
                <span className="label">{latestSim.topic}</span>
              </div>

              {latestSim.activeAgents.length > 0 && (
                <div>
                  <p className="label mb-2">active agent roster ({latestSim.activeAgents.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {latestSim.activeAgents.map((a, i) => (
                      <span key={i} className="badge badge-gray">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {latestSim.scenarios.length > 0 && (
                <div>
                  <p className="label mb-2">scenarios</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {latestSim.scenarios.map((s, i) => (
                      <div key={i} className="card-paper flex gap-3 p-3">
                        <Ring pct={s.likelihood * 100} color="var(--accent)" size={48} />
                        <div className="flex-1">
                          <p className="text-[13px] font-medium">{s.title}</p>
                          <p className="label mt-1">
                            likelihood {Math.round(s.likelihood * 100)}% · confidence {Math.round(s.confidence * 100)}%
                          </p>
                          {s.upside && <p className="mt-2 text-[12.5px] text-[var(--muted)]">↑ {s.upside}</p>}
                          {s.downside && <p className="mt-1 text-[12.5px] text-[var(--muted)]">↓ {s.downside}</p>}
                          <button
                            className="btn-ghost mt-2 text-[12px]"
                            onClick={() => attachScenarioToTraceability(s.title, [])}
                            disabled={attachedConclusions.has(s.title)}
                          >
                            {attachedConclusions.has(s.title) ? "attached ✓" : "attach to traceability"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestSim.feed.length > 0 && (
                <div>
                  <p className="label mb-2">live citizen feed ({latestSim.feed.length} opinions)</p>
                  <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
                    {latestSim.feed.map((f) => (
                      <div key={f.id} className="card-paper flex items-start gap-2 p-2.5">
                        <span className={`sentiment-dot ${f.sentiment} mt-1.5`} />
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-[12px] font-medium">{f.agent}</span>
                            <span className={`badge ${SENTIMENT_BADGE[f.sentiment]}`}>{f.sentiment}</span>
                          </div>
                          <p className="text-[12.5px] text-[var(--muted)]">{f.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "influence" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="label">influence — momentum plan</p>
            <button className="btn" onClick={generateMomentumPlan} disabled={generatingPlan}>
              {generatingPlan ? "generating…" : data.momentumPlan ? "regenerate plan" : "generate plan"}
            </button>
          </div>
          {planError && <p className="mb-2 text-[13px] text-[var(--red)]">{planError}</p>}
          {!data.momentumPlan && !generatingPlan && <p className="label">no plan yet — targets this founder&apos;s weakest signal</p>}
          {data.momentumPlan && (
            <div className="flex flex-col gap-3">
              <div className="card-paper p-3">
                <p className="text-[13px]">{data.momentumPlan.summary}</p>
                <p className="label mt-1">
                  horizon {data.momentumPlan.horizonDays} days · source {data.momentumPlan.source}
                </p>
              </div>
              <div className="relative flex flex-col gap-3 border-l-2 border-[var(--faint)] pl-5">
                {data.momentumPlan.actions.map((a) => {
                  const done = doneActions.has(a.id);
                  const logged = loggedActions.has(a.id);
                  return (
                    <div key={a.id} className="card-paper relative p-3">
                      <span
                        className="absolute -left-[26px] top-4 h-2.5 w-2.5 rounded-full"
                        style={{ background: done ? "var(--green)" : "var(--accent)" }}
                      />
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`text-[13px] font-medium ${done ? "line-through opacity-60" : ""}`}>{a.title}</span>
                        <span className="badge badge-gray">{a.channel}</span>
                        {a.linkedSignal && <span className="badge badge-amber">{a.linkedSignal.replace(/_/g, " ")}</span>}
                        {a.dueAt && <span className="label">due {new Date(a.dueAt).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-[12.5px] text-[var(--muted)]">{a.rationale}</p>
                      <p className="label mt-1">{a.expectedOutcome}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          className="btn-ghost text-[12px]"
                          onClick={() => setDoneActions((prev) => new Set(prev).add(a.id))}
                          disabled={done}
                        >
                          {done ? "done ✓" : "mark done"}
                        </button>
                        <button className="btn-ghost text-[12px]" onClick={() => logActionToTraceability(a)} disabled={logged}>
                          {logged ? "logged ✓" : "log to traceability"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "audio" && (
        <section className="flex flex-col gap-6">
          <div>
            <p className="label mb-3">voice briefing &amp; Q&amp;A</p>
            <div className="card-paper p-5">
              <VoicePlayer dealId={params.id} />
            </div>
          </div>

          <div>
            <p className="label mb-3">memo read-aloud via ElevenLabs</p>
            {!data.memo && <p className="label">generate an investment memo first (top-right button) — audio reads from its content</p>}
          {data.memo && (
            <div className="card-paper p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`badge ${audioStatus === "ready" ? "badge-green" : audioStatus === "error" ? "badge-red" : audioStatus === "generating" ? "badge-amber" : "badge-gray"}`}
                >
                  {audioStatus === "idle" ? "not generated" : audioStatus}
                </span>
                <button className="btn" onClick={generateAudio} disabled={generatingAudio}>
                  {generatingAudio ? "generating audio…" : "generate memo audio"}
                </button>
              </div>
              <p className="label mb-3">clipped to a short excerpt — quota-limited</p>
              {audioError && <p className="mb-2 text-[13px] text-[var(--red)]">{audioError}</p>}
              {audioUrl && (
                <div className="flex flex-col gap-2">
                  <audio className="w-full" controls src={audioUrl}>
                    <track kind="captions" />
                  </audio>
                  <a href={audioUrl} download="memo-audio.mp3" className="link-green label">
                    ↓ download mp3
                  </a>
                </div>
              )}
            </div>
          )}
          </div>
        </section>
      )}
    </div>
  );
}
