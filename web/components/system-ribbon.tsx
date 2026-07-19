"use client";

import { useEffect, useState } from "react";

interface StatusResponse {
  mode: "live" | "mock";
  swarm: "live" | "mock";
  tavily: "live" | "mock";
  elevenlabs: "live" | "off";
}

const DOT_COLOR: Record<string, string> = {
  live: "var(--green)",
  mock: "var(--amber)",
  off: "var(--faint)",
};

function Chip({ label, state }: { label: string; state: string }) {
  return (
    <span className="flex items-center gap-1 text-[10.5px] text-[var(--muted)]" title={`${label}: ${state}`}>
      <span className="dot" style={{ background: DOT_COLOR[state] ?? "var(--faint)" }} />
      {label}
    </span>
  );
}

// Compact top-right panel showing whether each integration is genuinely
// live for this run or silently falling back to mock/off — so a demo never
// claims more than the current .env actually backs up. Dot color + hover
// title carry the state so the label text itself can stay short.
export default function SystemRibbon() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/system-status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div className="card-paper hidden items-center gap-2.5 px-2.5 py-1.5 xl:flex">
      <Chip label="mode" state={status.mode} />
      <Chip label="swarm" state={status.swarm} />
      <Chip label="tavily" state={status.tavily} />
      <Chip label="audio" state={status.elevenlabs} />
    </div>
  );
}
