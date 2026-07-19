import Link from "next/link";

export default function Home() {
  return (
    <div className="rise flex flex-col gap-10 py-10">
      <div className="relative">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
        />
        <p className="label mb-3">sourcing &rarr; screening &rarr; diligence &rarr; decision</p>
        <h1 className="serif text-[46px] leading-[1.05]">
          First founder signal to a confident $100K check in 24 hours.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-[var(--muted)]">
          The VC Brain scores founders on process signal even with zero funding history, keeps every
          score as an honest interval instead of a bare number, and never fabricates a missing data
          point.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/source" className="btn">
          <span>source a founder</span>
          <span>&rarr;</span>
        </Link>
        <Link href="/dashboard" className="btn btn-ghost">
          decision-ready queue
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-paper p-6 rise rise-delay-1">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(11, 168, 79, 0.12)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[13px] font-medium mb-1">cold-start scoring</p>
          <p className="text-[13px] text-[var(--muted)]">Process signal, not identity. Wide honest intervals for thin data, never a penalty.</p>
        </div>
        <div className="card-paper p-6 rise rise-delay-2">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(28, 78, 216, 0.12)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10l3-3 2 2 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[13px] font-medium mb-1">decomposed trust</p>
          <p className="text-[13px] text-[var(--muted)]">Every score ships as data volume x cleanliness x signal agreement. Never a bare number.</p>
        </div>
        <div className="card-paper p-6 rise rise-delay-3">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(216, 75, 59, 0.12)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="var(--red)" strokeWidth="1.5"/>
              <path d="M7 4v4M7 9.5v.5" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-[13px] font-medium mb-1">agentic traceability</p>
          <p className="text-[13px] text-[var(--muted)]">Every conclusion cites the exact claim and source URL. Bridged into the diligence signal log.</p>
        </div>
      </div>

      <div className="card-paper p-5">
        <p className="label mb-2">voice-powered deal briefings</p>
        <p className="text-[13.5px] text-[var(--muted)]">
          Ask the VC Brain about any deal. Get spoken briefings, ask follow-up questions,
          and hear the system&apos;s reasoning explained naturally. Powered by ElevenLabs.
        </p>
      </div>
    </div>
  );
}
