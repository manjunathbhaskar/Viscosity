"use client";

import { useRef } from "react";

// "Viscosity" = fluid friction/density — so a hover on these cards should
// feel like pushing through a dense data field, not just a flat elevation.
// A radial dot-matrix only lights up under the cursor (mouse-position CSS
// vars), plus an animated border-beam that sweeps on hover.
export default function FrictionCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} className="friction-card" onMouseMove={onMouseMove}>
      <div className="friction-card-grid" />
      <div className="friction-card-beam" />
      <div className="relative">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(230,106,45,0.12)]">
          {icon}
        </div>
        <p className="mb-1 text-[13px] font-medium">{title}</p>
        <p className="text-[13px] text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}
