"use client";

import { useEffect, useState } from "react";

// Ticks 0 -> 375 on mount (roughly the real 174 expert + ~200 citizen
// BlackSwanX roster — see lib/swarm-bridge.ts), then settles with a
// "synchronized" mark. Purely cosmetic on the landing page; the real count
// per run varies by mode (turbo/standard/deep) and is shown accurately on
// the deal page's Simulation tab.
export default function SwarmCounter() {
  const [count, setCount] = useState(0);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const target = 375;
    const duration = 1400;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setSynced(true);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="mono inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
      swarm agents
      <span className="text-[var(--ink)] font-medium">{count}</span>
      {synced && <span className="text-[var(--green)]">✓ synchronized</span>}
    </span>
  );
}
