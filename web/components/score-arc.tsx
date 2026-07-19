"use client";

interface ScoreArcProps {
  score: number;
  low: number;
  high: number;
  label: string;
  trend?: "up" | "down" | "flat";
  confidence?: number;
  size?: "sm" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green)";
  if (score <= 35) return "var(--red)";
  return "var(--accent)";
}

function TrendArrow({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <span style={{ color: "var(--green)" }}>▲</span>;
  if (trend === "down") return <span style={{ color: "var(--red)" }}>▼</span>;
  return <span style={{ color: "var(--muted)" }}>—</span>;
}

// Deliberately a plain horizontal interval bar, not an arc/gauge. This
// component broke twice as an SVG semicircle (a CSS rule silently fighting
// the component's own rotation math, then an interval band that read as
// disconnected from its track) — a bar built from percentage-positioned
// divs has no geometry to get wrong: `left: ${low}%` and `width: ${high-low}%`
// are the whole story, verifiable by reading the numbers.
export default function ScoreArc({ score, low, high, label, trend, confidence, size = "lg" }: ScoreArcProps) {
  const color = scoreColor(score);
  const clampedLow = Math.max(0, Math.min(100, low));
  const clampedHigh = Math.max(0, Math.min(100, high));
  const clampedScore = Math.max(0, Math.min(100, score));

  const barWidth = size === "lg" ? 128 : 68;
  const barHeight = size === "lg" ? 6 : 4;

  return (
    <div className="flex flex-col items-center" style={{ width: barWidth }}>
      <span className={`serif leading-none ${size === "lg" ? "text-[26px]" : "text-[15px]"}`} style={{ color }}>
        {score}
      </span>
      {size === "lg" && (
        <span className="label mt-0.5 flex items-center gap-1.5">
          {label}
          {trend && <TrendArrow trend={trend} />}
        </span>
      )}
      <div className="relative mt-1.5 rounded-full" style={{ width: barWidth, height: barHeight, background: "var(--faint)", opacity: 0.5 }}>
        <div
          className="absolute top-0 rounded-full"
          style={{ left: `${clampedLow}%`, width: `${Math.max(2, clampedHigh - clampedLow)}%`, height: barHeight, background: color, opacity: 0.55 }}
        />
        <div
          className="absolute rounded-full border-2 border-[var(--paper)]"
          style={{
            left: `${clampedScore}%`,
            top: -(barHeight / 2 + 1),
            width: barHeight * 2 + 2,
            height: barHeight * 2 + 2,
            transform: "translateX(-50%)",
            background: color,
          }}
        />
      </div>
      {size === "lg" && confidence !== undefined && (
        <span className="mono mt-1.5 text-[10px] text-[var(--faint)]">
          {low}–{high} · {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
