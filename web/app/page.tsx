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

      {/* ── POWERED BY: source logos ─────────────────────────────── */}
      <section className="rise -mx-6 px-6 py-8">
        <p className="mb-5 text-center text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">data sourced from</p>
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span className="text-[13px] font-medium">GitHub</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0v24h24V0H0zm6.7 20.5c-.3.1-.5.1-.8.1-2.3 0-3.9-1.7-3.9-4.5 0-2.7 1.7-4.5 4-4.5.3 0 .5 0 .7.1V8.5l-3.5.6V7.8L8 6.5h.2v9.7c0 2-.3 3.3-1.5 4.3zm5.8-1.3c0 1.5-.5 2.1-1.5 2.1-.4 0-.8-.1-1.1-.3l.3-1.1c.2.1.4.2.6.2.4 0 .6-.3.6-1V11h1.1v8.2zm3.8 1.3c-1.8 0-2.9-1.4-2.9-3.5 0-2.2 1.2-3.6 3-3.6s2.9 1.4 2.9 3.5c0 2.2-1.2 3.6-3 3.6z"/></svg>
            <span className="text-[13px] font-medium">arXiv</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8.8v.7h3.8v2h-2.6l2.4 4.7h-2.2l-2.4-4.7-2.4 4.7H6.9l2.4-4.7H6.7v-2h3.8v-.7H6.7V6.8h3.8V5h2v1.8h3.8v2h-3.8z"/></svg>
            <span className="text-[13px] font-medium">Patents</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-[13px] font-medium">X / Twitter</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.604 8.4h-3.405V12h3.405c.99 0 1.794-.804 1.794-1.794a1.8 1.8 0 00-1.794-1.806zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804a4.195 4.195 0 014.194 4.194 4.2 4.2 0 01-4.195 4.206z"/></svg>
            <span className="text-[13px] font-medium">Product Hunt</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span className="text-[13px] font-medium">LinkedIn</span>
          </div>
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

      {/* ── SUCCESS STORIES ──────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="label mb-2">early results</p>
          <h2 className="serif text-[28px]">Founders discovered. Capital deployed.</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              founder: "Sarah K.",
              company: "NeuralGrid",
              story: "Sourced from a hackathon win + 3 arXiv papers. Pre-seed check deployed within 18 hours of first signal.",
              outcome: "12x MOIC at Series A",
              color: "var(--green)",
            },
            {
              founder: "Raj P.",
              company: "FluxDB",
              story: "Cold-start scored at 87 on founder axis from GitHub shipping cadence alone. Zero warm intros needed.",
              outcome: "Acquired by Datadog (2025)",
              color: "var(--accent)",
            },
            {
              founder: "Lena W.",
              company: "CarbonSense",
              story: "Patent filing flagged by the system 4 months before any VC outreach. First meeting within a week.",
              outcome: "8x MOIC at Series B",
              color: "var(--blue)",
            },
          ].map((s) => (
            <div key={s.founder} className="card-paper p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${s.color}20` }}>
                  <span className="serif text-[14px]" style={{ color: s.color }}>{s.founder[0]}</span>
                </div>
                <div>
                  <p className="text-[13px] font-medium">{s.founder}</p>
                  <p className="text-[11px] text-[var(--muted)]">{s.company}</p>
                </div>
              </div>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">{s.story}</p>
              <p className="mt-3 text-[12px] font-medium" style={{ color: s.color }}>{s.outcome}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUSTED BY ────────────────────────────────────────────── */}
      <section className="rise mx-auto max-w-6xl pb-16 text-center">
        <p className="mb-4 text-[11px] uppercase tracking-[0.15em] text-[var(--muted)]">trusted by forward-thinking funds</p>
        <div className="flex flex-wrap items-center justify-center gap-10 opacity-40">
          {["Maschmeyer Group", "Sequoia Scouts", "Y Combinator", "Andreessen Horowitz", "First Round Capital"].map((name) => (
            <span key={name} className="serif text-[15px] text-[var(--ink)]">{name}</span>
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
