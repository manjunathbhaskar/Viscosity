"use client";

interface TrustMeterProps {
  confidence: number;
  components: { dataVolume: number; dataCleanliness: number; signalAgreement: number };
  level: "high" | "medium" | "low";
  compact?: boolean;
}

function barColor(value: number): string {
  if (value >= 0.7) return "var(--green)";
  if (value >= 0.4) return "var(--amber)";
  return "var(--red)";
}

const LEVEL_DOT: Record<string, string> = { high: "var(--green)", medium: "var(--amber)", low: "var(--red)" };

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-10 text-[10px] text-[var(--muted)]">{label}</span>}
      <div className="meter-bar flex-1">
        <div
          className="meter-fill"
          style={{
            background: barColor(value),
            transform: `scaleX(${value})`,
          }}
        />
      </div>
    </div>
  );
}

export default function TrustMeter({ confidence, components, level, compact }: TrustMeterProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="dot" style={{ background: LEVEL_DOT[level] }} />
        <span className="mono text-[11px]">{Math.round(confidence * 100)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 flex-col gap-1">
        <Bar value={components.signalAgreement} label="agree" />
        <Bar value={components.dataVolume} label="vol" />
        <Bar value={components.dataCleanliness} label="clean" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="dot" style={{ background: LEVEL_DOT[level] }} />
        <span className="mono text-[12px]">{Math.round(confidence * 100)}%</span>
      </div>
    </div>
  );
}
