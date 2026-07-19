import Link from "next/link";
import HeroOrb from "@/components/hero-orb";
import ScanningText from "@/components/scanning-text";
import FrictionCard from "@/components/friction-card";
import UncertaintyDemo from "@/components/uncertainty-demo";
import SwarmCounter from "@/components/swarm-counter";

export default function Home() {
  return (
    <>
      {/* ── HERO: Dark, cinematic, full-viewport ───────────────── */}
      <section className="hero-dark relative -mx-6 -mt-6 flex min-h-[100vh] flex-col items-center justify-center overflow-hidden px-6">
        <HeroOrb />

        <div className="hero-gradient-top" />
        <div className="hero-gradient-bottom" />

        <div className="rise relative z-10 flex max-w-4xl flex-col items-center gap-8 text-center">
          <div className="hero-badge">
            <span className="status-ping" />
            <span>scanning global founder signals</span>
            <SwarmCounter />
          </div>

          <h1 className="hero-title">
            We find exceptional founders<br />
            <span className="hero-accent">before the world does</span>
          </h1>

          <p className="hero-subtitle">
            Viscosity scans GitHub, arXiv, patents, hackathons, and social signals across the globe.
            From first signal to $100K conviction in 24 hours. No network required. No warm intro needed.
          </p>

          <div className="hero-scanner-wrap">
            <ScanningText />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard/source" className="hero-btn-primary">
              source a founder &rarr;
            </Link>
            <Link href="/dashboard/discover" className="hero-btn-secondary">
              discover talent
            </Link>
            <Link href="/dashboard" className="hero-btn-secondary">
              view deal queue
            </Link>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M5 11l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── STATS: Glowing counters ───────────────────────────────── */}
      <section className="rise -mx-6 border-y border-[var(--faint)]/20 bg-[var(--paper)]/60 px-6 py-10 backdrop-blur-sm">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: "6+", label: "data sources", color: "var(--accent)" },
            { value: "24h", label: "signal to check", color: "var(--green)" },
            { value: "3", label: "independent axes", color: "var(--blue)" },
            { value: "0", label: "fabricated claims", color: "var(--amber)" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="serif text-[36px] leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="label mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GLOBAL REACH callout ──────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl py-16 text-center">
        <div className="card-dark p-10 sm:p-14">
          <p className="label mb-3 text-[rgba(255,255,255,0.4)]">built for global deals</p>
          <h2 className="serif text-[clamp(24px,4vw,36px)] text-[#f3efe9]">
            Founders are everywhere.<br />Capital shouldn&apos;t need a warm intro to find them.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] text-[rgba(255,255,255,0.5)]">
            San Francisco, Berlin, Singapore, Tel Aviv, Lagos. Viscosity scans signals from every timezone,
            scores without network bias, and surfaces talent purely on merit and momentum.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
            {["GitHub", "arXiv", "Patents", "Hackathons", "X/Twitter", "Product Hunt"].map((s) => (
              <span key={s} className="rounded-full border border-[rgba(230,106,45,0.3)] bg-[rgba(230,106,45,0.08)] px-3 py-1 text-[12px] text-[rgba(230,106,45,0.9)]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ─────────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">live demo</p>
          <h2 className="serif text-[28px]">Honest intervals, not fake precision</h2>
          <p className="mt-2 text-[14px] text-[var(--muted)]">Every score ships with its confidence range. Thin data widens the interval. It never lies.</p>
        </div>
        <div className="mx-auto max-w-md">
          <UncertaintyDemo />
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">how it works</p>
          <h2 className="serif text-[28px]">Three pillars. No black boxes.</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <FrictionCard
            title="cold-start scoring"
            body="Process signal, not identity. Shipping cadence, completion rate, artifact velocity. No penalty for being unknown."
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" /></svg>}
          />
          <FrictionCard
            title="decomposed trust"
            body="Every claim scored on data volume, source cleanliness, and signal agreement. You see exactly why."
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10l3-3 2 2 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          />
          <FrictionCard
            title="voice briefings"
            body="Click 'brief me' on any deal. ElevenLabs speaks the rationale, red flags, and recommendation."
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5.5v3a4 4 0 008 0v-3" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" /><path d="M7 1v2M5 12h4" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" /></svg>}
          />
        </div>
      </section>

      {/* ── PIPELINE ──────────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">the pipeline</p>
          <h2 className="serif text-[28px]">Four stages. Fully autonomous.</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { n: "01", title: "source", desc: "Scan GitHub, arXiv, patents, hackathons, X globally", color: "var(--accent)" },
            { n: "02", title: "screen", desc: "3-axis scoring + thesis fit gate + cold-start handling", color: "var(--green)" },
            { n: "03", title: "diligence", desc: "Red flags, trust decomposition, contradiction detection", color: "var(--blue)" },
            { n: "04", title: "decide", desc: "Investment memo, voice briefing, conviction threshold", color: "var(--amber)" },
          ].map((s) => (
            <div key={s.n} className="card-paper p-5 text-center">
              <p className="serif text-[28px] leading-none" style={{ color: s.color }}>{s.n}</p>
              <p className="mt-2 text-[14px] font-medium">{s.title}</p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-20 text-center">
        <h2 className="serif text-[28px]">The next Cursor founder is building right now.</h2>
        <p className="mt-2 text-[14px] text-[var(--muted)]">Find them before anyone else. Source globally. Decide in 24 hours.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard/source" className="btn text-[14px] px-7 py-3.5">
            source a founder &rarr;
          </Link>
          <Link href="/dashboard/discover" className="btn-ghost text-[14px] px-7 py-3.5">
            discover talent globally
          </Link>
        </div>
      </section>
    </>
  );
}
