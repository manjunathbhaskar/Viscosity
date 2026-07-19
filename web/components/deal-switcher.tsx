"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface DealMeta {
  id: string;
  founderName: string;
  companyName: string;
  stage: string;
}

// Jump-to-deal command palette — click (or Cmd/Ctrl+K) to open, type to
// filter, Enter/click to navigate. Deliberately not an inline hover dropdown
// sitting next to the "deals" nav link — that read as a confusing duplicate
// ("deals → deals") and opened on ambient mouseover instead of intent.
export default function DealSwitcher() {
  const [deals, setDeals] = useState<DealMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(data.deals ?? []))
      .catch(() => setDeals([]));
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return deals;
    const q = query.toLowerCase();
    return deals.filter((d) => `${d.founderName} ${d.companyName}`.toLowerCase().includes(q));
  }, [deals, query]);

  return (
    <>
      <button className="btn-ghost flex items-center gap-1.5 text-[13px]" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        jump to deal
        <span className="mono text-[10px] text-[var(--faint)]">⌘K</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(31,31,31,0.35)] pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="card-paper w-full max-w-md p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              className="input mb-2"
              placeholder="search founder or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              {filtered.length === 0 && <p className="label px-2 py-1.5">no matching deals</p>}
              {filtered.map((d) => (
                <button
                  key={d.id}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-[var(--card-deep)]"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/deal/${d.id}`);
                  }}
                >
                  <span>
                    {d.founderName} · {d.companyName}
                  </span>
                  <span className="label">{d.stage.replace("_", " ")}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
