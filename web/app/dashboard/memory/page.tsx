export default function MemoryPage() {
  return (
    <div className="rise flex flex-col gap-6">
      <div>
        <p className="label mb-1">memory layer</p>
        <h1 className="serif text-[28px]">Persistent founder memory</h1>
        <p className="mt-2 max-w-xl text-[13.5px] text-[var(--muted)]">
          Founder Scores strengthen (interval narrows) with corroborating claims across applications
          and widen on contradiction — they never reset between runs. See{" "}
          <code className="mono text-[12px]">lib/memory/founder-score.ts</code>.
        </p>
      </div>
      <div className="card-paper p-6">
        <p className="text-[13.5px]">
          Per-deal memory (claims, sources, trust scores, traceability) is browsable from each deal&apos;s
          page — open a deal from the{" "}
          <a href="/dashboard" className="link-green">
            decision-ready queue
          </a>{" "}
          to see its full evidence trail.
        </p>
      </div>
    </div>
  );
}
