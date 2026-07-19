"use client";

import { useEffect, useState } from "react";

const SCANS = [
  "scanning GitHub for shipping velocity signals...",
  "found: 14 repos, weekly release cadence, 62 followers",
  "scanning arXiv for recent publications...",
  "found: 2 papers on autonomous navigation (2026)",
  "scanning patents for IP filings...",
  "found: PCT/US2026/041892 — filed 3 months ago",
  "scoring founder axis: 84/100 (cold-start path)",
  "scoring market axis: 78/100 (growing TAM, $74B by 2030)",
  "red flag scan: clean — no material contradictions",
  "generating investment memo...",
  "voice briefing ready — ElevenLabs synthesis complete",
  "decision: conviction threshold crossed at 82%",
];

export default function ScanningText() {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (charIndex < SCANS[lineIndex].length) {
        setCharIndex((c) => c + 1);
      } else {
        setLines((prev) => [...prev.slice(-4), SCANS[lineIndex]]);
        setLineIndex((i) => (i + 1) % SCANS.length);
        setCharIndex(0);
      }
    }, 35);
    return () => clearInterval(interval);
  }, [lineIndex, charIndex]);

  return (
    <div className="hero-scanner">
      {lines.map((line, i) => (
        <p key={`${i}-${line}`} className="hero-scan-line faded">
          <span className="hero-scan-prefix">&gt;</span> {line}
        </p>
      ))}
      <p className="hero-scan-line active">
        <span className="hero-scan-prefix">&gt;</span> {SCANS[lineIndex].slice(0, charIndex)}
        <span className="hero-cursor" />
      </p>
    </div>
  );
}
