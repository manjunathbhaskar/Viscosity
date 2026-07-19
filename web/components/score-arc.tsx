"use client";

import { useEffect, useState } from "react";

interface ScoreArcProps {
  score: number;
  low: number;
  high: number;
  label: string;
  trend?: "up" | "down" | "flat";
  confidence?: number;
  size?: "sm" | "lg";
}

function arcColor(score: number): string {
  if (score >= 70) return "var(--green)";
  if (score <= 35) return "var(--red)";
  return "var(--accent)";
}

function TrendArrow({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="text-[var(--green)]">
        <path d="M5 1L9 6H1L5 1Z" fill="currentColor" />
      </svg>
    );
  }
  if (trend === "down") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="text-[var(--red)]">
        <path d="M5 9L1 4H9L5 9Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="9" height="6" viewBox="0 0 10 6" fill="none" className="text-[var(--muted)]">
      <rect y="2" width="10" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

// A point on the semicircle swept from 180° (left) through 90° (top) to 0°
// (right) as t goes 0 -> 1. Screen-space (y grows downward), so this is a
// plain, verifiable trig computation — no CSS transforms, no SVG rotation
// tricks that can silently conflict with something else on the page.
function arcPoint(cx: number, cy: number, r: number, t: number): { x: number; y: number } {
  const angle = (Math.PI * (180 - 180 * t)) / 180;
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, t0: number, t1: number): string {
  const a = arcPoint(cx, cy, r, t0);
  const b = arcPoint(cx, cy, r, t1);
  const largeArc = t1 - t0 > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${largeArc} 1 ${b.x} ${b.y}`;
}

export default function ScoreArc({ score, low, high, label, trend, confidence, size = "lg" }: ScoreArcProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dim = size === "lg" ? 128 : 68;
  const stroke = size === "lg" ? 9 : 6;
  const r = (dim - stroke) / 2;
  const cx = dim / 2;
  const cy = r + stroke / 2; // viewBox height is exactly tall enough for the top half + stroke
  const height = cy + stroke / 2;

  const color = arcColor(score);
  const t0 = mounted ? Math.max(0, Math.min(1, low / 100)) : 0;
  const t1 = mounted ? Math.max(0, Math.min(1, high / 100)) : 0;
  const tScore = mounted ? Math.max(0, Math.min(1, score / 100)) : 0;
  const marker = arcPoint(cx, cy, r, tScore);

  return (
    <div className="flex flex-col items-center" style={{ width: dim }}>
      <svg width={dim} height={height} viewBox={`0 0 ${dim} ${height}`}>
        <path d={arcPath(cx, cy, r, 0, 1)} stroke="var(--faint)" strokeWidth={stroke} fill="none" opacity={0.4} strokeLinecap="round" />
        <path
          d={arcPath(cx, cy, r, t0, t1)}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          opacity={mounted ? 0.85 : 0}
          style={{ transition: "opacity 600ms ease 150ms" }}
        />
        <circle
          cx={marker.x}
          cy={marker.y}
          r={stroke / 2 + 2.5}
          fill={color}
          stroke="var(--paper)"
          strokeWidth={2}
          opacity={mounted ? 1 : 0}
          style={{ transition: "opacity 600ms ease 150ms" }}
        />
      </svg>
      <div className="-mt-0.5 flex flex-col items-center text-center">
        <span className={`serif leading-none ${size === "lg" ? "text-[26px]" : "text-[15px]"}`} style={{ color }}>
          {score}
        </span>
        {size === "lg" && (
          <span className="label mt-1 flex items-center gap-1.5">
            {label}
            {trend && <TrendArrow trend={trend} />}
          </span>
        )}
        {size === "lg" && confidence !== undefined && (
          <span className="mono mt-0.5 text-[10px] text-[var(--faint)]">
            {low}–{high} · {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
