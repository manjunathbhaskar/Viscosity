import Link from "next/link";
import LogCascade from "@/components/log-cascade";
import SwarmCounter from "@/components/swarm-counter";
import UncertaintyDemo from "@/components/uncertainty-demo";
import FrictionCard from "@/components/friction-card";

export default function Home() {
  return (
    <>
      <LogCascade />
      <div className="rise relative flex flex-col gap-10 py-10">
        <div className="relative">
          <div
            className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
          />
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="label">sourcing &rarr; screening &rarr; diligence &rarr; decision</p>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <span className="status-ping" />
              live
            </span>
          </div>
          <h1 className="serif text-[46px] leading-[1.05]">
            First founder signal to a confident $100K check in 24 hours.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-[var(--muted)]">
            Viscosity scores founders on process signal even with zero funding history, keeps every
            score as an honest interval instead of a bare number, and never fabricates a missing data
            point.
          </p>

          <div className="mt-5 max-w-sm">
            <UncertaintyDemo />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="/dashboard/source" className="btn">
            <span>source a founder</span>
            <span>&rarr;</span>
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            decision-ready queue
          </Link>
          <SwarmCounter />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FrictionCard
            title="cold-start scoring"
            body="Process signal, not identity. Wide honest intervals for thin data, never a penalty."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
          <FrictionCard
            title="decomposed trust"
            body="Every score ships as data volume x cleanliness x signal agreement. Never a bare number."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10l3-3 2 2 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <FrictionCard
            title="agentic traceability"
            body="Every conclusion cites the exact claim and source URL. Bridged into the diligence signal log."
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="var(--red)" strokeWidth="1.5" />
                <path d="M7 4v4M7 9.5v.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        <div className="card-paper p-5">
          <p className="label mb-2">voice-powered deal briefings</p>
          <p className="text-[13.5px] text-[var(--muted)]">
            Ask Viscosity about any deal. Get spoken briefings, ask follow-up questions, and hear the
            system&apos;s reasoning explained naturally. Powered by ElevenLabs.
          </p>
        </div>
      </div>
    </>
  );
}
