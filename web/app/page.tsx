import Link from "next/link";

export default function Home() {
  return (
    <div className="rise flex flex-col gap-8 py-10">
      <div>
        <p className="label mb-3">sourcing → screening → diligence → decision</p>
        <h1 className="serif text-[42px] leading-[1.05]">
          First founder signal to a confident $100K check decision in 24 hours.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-[var(--muted)]">
          The VC Brain scores founders on process signal even with zero funding history, keeps every
          score as an honest interval instead of a bare number, and never fabricates a missing data
          point — it flags it.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/dashboard/source" className="btn">
          <span>source a founder</span>
          <span>→</span>
        </Link>
        <Link href="/dashboard" className="btn btn-ghost">
          decision-ready queue
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card-paper p-5">
          <p className="label mb-1">novel element 1</p>
          <p className="text-[14px]">Cold-start scoring off process signal, not identity — wide honest intervals, never a penalty for thin data.</p>
        </div>
        <div className="card-paper p-5">
          <p className="label mb-1">novel element 3</p>
          <p className="text-[14px]">Every score ships as data volume × cleanliness × signal agreement — never a bare number.</p>
        </div>
        <div className="card-paper p-5">
          <p className="label mb-1">stretch: traceability</p>
          <p className="text-[14px]">Every conclusion cites the exact claim and source URL behind it, bridged into the diligence engine's own signal log.</p>
        </div>
      </div>
    </div>
  );
}
