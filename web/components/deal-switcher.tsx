"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DealMeta {
  id: string;
  founderName: string;
  companyName: string;
  stage: string;
}

// Multi-deal pipeline switcher. Every deal is its own row in the Memory
// layer store (not one shared active-state blob), so switching between
// deals is just navigation — no archive/restore step needed.
export default function DealSwitcher() {
  const [deals, setDeals] = useState<DealMeta[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(data.deals ?? []))
      .catch(() => setDeals([]));
  }, [open]);

  return (
    <div className="relative">
      <button className="label flex items-center gap-1.5" onClick={() => setOpen((o) => !o)}>
        <span className="dot" style={{ background: "var(--accent)" }} />
        deals
      </button>
      {open && (
        <div
          className="card-paper absolute right-0 top-6 z-20 w-64 p-2 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {deals.length === 0 && <p className="label px-2 py-1.5">no deals yet</p>}
          {deals.map((d) => (
            <button
              key={d.id}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-[var(--card)]"
              onClick={() => {
                setOpen(false);
                router.push(`/deal/${d.id}`);
              }}
            >
              <span>{d.founderName} · {d.companyName}</span>
              <span className="label">{d.stage.replace("_", " ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
