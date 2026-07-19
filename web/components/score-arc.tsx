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
      <span className="trend-arrow up">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1L9 6H1L5 1Z" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="trend-arrow down">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 9L1 4H9L5 9Z" fill="currentColor" />
        </svg>
      </span>
    );
  }
  return (
    <span className="trend-arrow flat">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
        <rect y="2" width="10" height="2" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function ScoreArc({ score, low, high, label, trend, confidence, size = "lg" }: ScoreArcProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dim = size === "lg" ? 120 : 64;
  const stroke = size === "lg" ? 8 : 5;
  const r = (dim - stroke) / 2;
  const cx = dim / 2;
  const cy = dim / 2;
  const circumference = Math.PI * r;

  const scoreOffset = circumference - (circumference * (score / 100));
  const lowOffset = circumference - (circumference * (low / 100));
  const highOffset = circumference - (circumference * (high / 100));

  const color = arcColor(score);

  return (
    <div className="arc-gauge" style={{ width: dim, height: dim * 0.6 }}>
      <svg width={dim} height={dim * 0.6} viewBox={`0 0 ${dim} ${dim * 0.6}`}>
        <g transform={`rotate(180, ${cx}, ${cy * 0.6})`}>
          <circle
            className="arc-track"
            cx={cx}
            cy={cy * 0.6}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference}
          />
          <circle
            className="arc-interval"
            cx={cx}
            cy={cy * 0.6}
            r={r}
            strokeWidth={stroke + 4}
            stroke={color}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={mounted ? lowOffset : circumference}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2, 0.7, 0.2, 1) 200ms" }}
          />
          <circle
            className="arc-interval"
            cx={cx}
            cy={cy * 0.6}
            r={r}
            strokeWidth={stroke + 4}
            stroke="var(--bg)"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={mounted ? highOffset : circumference}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2, 0.7, 0.2, 1) 200ms" }}
          />
          <circle
            className="arc-fill"
            cx={cx}
            cy={cy * 0.6}
            r={r}
            strokeWidth={stroke}
            stroke={color}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={mounted ? scoreOffset : circumference}
          />
        </g>
      </svg>
      <div className="arc-label">
        <span className={`serif ${size === "lg" ? "text-[24px]" : "text-[14px]"} leading-none`} style={{ color }}>
          {score}
        </span>
        {size === "lg" && (
          <span className="label mt-0.5 flex items-center gap-1">
            {label}
            {trend && <TrendArrow trend={trend} />}
          </span>
        )}
        {size === "lg" && confidence !== undefined && (
          <span className="mono text-[10px] text-[var(--faint)]">
            {low}-{high} · {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
