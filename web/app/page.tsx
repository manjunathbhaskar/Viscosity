import Link from "next/link";
import LogCascade from "@/components/log-cascade";
import SwarmCounter from "@/components/swarm-counter";
import UncertaintyDemo from "@/components/uncertainty-demo";
import FrictionCard from "@/components/friction-card";
import HeroOrb from "@/components/hero-orb";

export default function Home() {
  return (
    <>
      <LogCascade />

      {/* ── HERO: Full viewport cinematic intro ─────────────────── */}
      <section className="relative -mx-6 -mt-6 flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <HeroOrb />

        <div className="rise relative z-10 flex max-w-3xl flex-col items-center gap-6">
          <div className="flex items-center gap-2 rounded-full border border-[var(--faint)] bg-[var(--paper)]/80 px-4 py-1.5 backdrop-blur-md">
            <span className="status-ping" />
            <span className="mono text-[11px] text-[var(--muted)]">live — 4 founders scored, 21 claims verified</span>
          </div>

          <h1 className="serif text-[clamp(36px,6vw,64px)] leading-[1.05]">
            From first signal to<br />
            <span style={{ color: "var(--accent)" }}>$100K conviction</span><br />
            in 24 hours
          </h1>

          <p className="max-w-lg text-[16px] leading-relaxed text-[var(--muted)]">
            Viscosity surfaces exceptional founders before anyone else, scores them honestly,
            and briefs you by voice. One living intelligence layer for the entire pipeline.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard/source" className="btn text-[14px] px-6 py-3">
              <span>source a founder</span>
              <span>&rarr;</span>
            </Link>
            <Link href="/dashboard" className="btn-ghost text-[14px] px-6 py-3">
              view deal queue
            </Link>
            <Link href="/dashboard/discover" className="btn-ghost text-[14px] px-6 py-3">
              discover talent
            </Link>
          </div>

          <SwarmCounter />
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--muted)]">
            <path d="M10 4v12M5 11l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────── */}
      <section className="rise -mx-6 border-y border-[var(--faint)]/30 bg-[var(--paper)]/60 px-6 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 sm:gap-16">
          <div className="text-center">
            <p className="serif text-[32px] leading-none" style={{ color: "var(--accent)" }}>3</p>
            <p className="label mt-1">scoring axes</p>
          </div>
          <div className="text-center">
            <p className="serif text-[32px] leading-none" style={{ color: "var(--green)" }}>24h</p>
            <p className="label mt-1">signal to decision</p>
          </div>
          <div className="text-center">
            <p className="serif text-[32px] leading-none" style={{ color: "var(--blue)" }}>6</p>
            <p className="label mt-1">data sources per founder</p>
          </div>
          <div className="text-center">
            <p className="serif text-[32px] leading-none" style={{ color: "var(--amber)" }}>0</p>
            <p className="label mt-1">fabricated data points</p>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO: Uncertainty interval ───────────────────────── */}
      <section className="rise mx-auto max-w-6xl py-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">live demo</p>
          <h2 className="serif text-[28px]">Honest intervals, not fake precision</h2>
          <p className="mt-2 text-[14px] text-[var(--muted)]">Every score ships with its confidence range. Thin data widens the interval. It never lies.</p>
        </div>
        <div className="mx-auto max-w-md">
          <UncertaintyDemo />
        </div>
      </section>

      {/* ── FEATURE CARDS with beam animation ─────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">how it works</p>
          <h2 className="serif text-[28px]">Three pillars. No black boxes.</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FrictionCard
            title="cold-start scoring"
            body="Process signal, not identity. Shipping cadence, completion rate, artifact velocity. Wide intervals for thin data, never a penalty for being unknown."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
          <FrictionCard
            title="decomposed trust"
            body="Every claim is scored on three components: data volume, source cleanliness, and signal agreement. You see exactly why a score is what it is."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10l3-3 2 2 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <FrictionCard
            title="voice briefings"
            body="Click 'brief me' on any deal. ElevenLabs speaks the scoring rationale, red flags, and recommendation. Ask follow-up questions by voice."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5.5v3a4 4 0 008 0v-3" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 1v2M5 12h4" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── PIPELINE VISUAL ───────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="card-dark p-8 sm:p-12">
          <p className="label mb-3 text-[#999]">the pipeline</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            {["sourcing", "screening", "diligence", "decision"].map((stage, i) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)]/40" style={{ background: "rgba(230, 106, 45, 0.1)" }}>
                  <span className="serif text-[16px]" style={{ color: "var(--accent)" }}>{i + 1}</span>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#f3efe9]">{stage}</p>
                  <p className="text-[11px] text-[#777]">
                    {stage === "sourcing" && "GitHub, arXiv, patents, X"}
                    {stage === "screening" && "3-axis score + thesis fit"}
                    {stage === "diligence" && "red flags + trust decomposition"}
                    {stage === "decision" && "memo + voice briefing"}
                  </p>
                </div>
                {i < 3 && <span className="hidden text-[var(--accent)] opacity-40 sm:inline">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-20 text-center">
        <h2 className="serif text-[28px]">Ready to find your next investment?</h2>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Source a founder now and watch the full pipeline run end-to-end.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard/source" className="btn text-[14px] px-6 py-3">
            source a founder &rarr;
          </Link>
          <Link href="/dashboard/discover" className="btn-ghost text-[14px] px-6 py-3">
            discover talent
          </Link>
        </div>
      </section>
    </>
  );
}
